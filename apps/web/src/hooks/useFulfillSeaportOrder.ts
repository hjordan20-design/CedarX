/**
 * useFulfillSeaportOrder
 *
 * Executes a Seaport order on-chain via the buyer's connected wallet.
 *
 * Supports two payment paths:
 *   - Native ETH orders: sends msg.value equal to the total ETH consideration
 *   - ERC-20 orders (WETH, USDC, …): approves the Seaport contract then
 *     calls fulfillOrder with no value
 *
 * Uses the Seaport v1.5 fulfillOrder() function directly through viem/wagmi
 * (no @opensea/seaport-js dependency required).
 *
 * Approval → fulfillment bridge
 * ------------------------------
 * Previous versions used a useEffect([approveConfirmed]) to trigger fulfillment
 * after approval — this was unreliable because:
 *   1. The eslint-disable on the deps array meant submitFulfill could be stale.
 *   2. void-ing the promise swallowed any early-return silently, leaving the UI
 *      frozen on "pending-approval" with no error shown.
 *
 * The current implementation calls publicClient.waitForTransactionReceipt()
 * inline inside execute() so the entire flow is one linear async chain with
 * no cross-effect handoff.
 */

import { useState, useCallback, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSendTransaction,
  useAccount,
  usePublicClient,
} from "wagmi";
import { SEAPORT_ADDRESS, NATIVE_TOKEN } from "@/config/contracts";

import { fetchSeaportFulfillment } from "@/lib/api";
import type { SeaportOrder, SeaportOrderParameters } from "@/lib/types";

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export type FulfillStep =
  | "idle"
  | "approving-token"
  | "pending-approval"
  | "fulfilling"
  | "pending-fulfill"
  | "success"
  | "error";

function isNativeEth(paymentToken: string): boolean {
  return paymentToken.toLowerCase() === NATIVE_TOKEN.toLowerCase() ||
         paymentToken === "0x0000000000000000000000000000000000000000";
}

/**
 * Safely extract and validate the executable parts of a SeaportOrder.
 *
 * Handles every broken shape that has been observed in production:
 *   1. orderParameters is null / undefined
 *   2. orderParameters was stored as a JSON string (text column vs jsonb)
 *   3. orderParameters is an object but .parameters is missing or null
 *   4. parameters.offer or parameters.consideration is null / not an array
 *
 * Returns null when the order cannot be fulfilled; callers must show an error.
 * Exported so BuyModal can use the same check at render time.
 */
export function getValidatedParams(
  order: SeaportOrder,
): { params: SeaportOrderParameters; signature: string } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let blob: any = order.orderParameters;
  if (blob == null) return null;

  // Some DB rows store the blob as a JSON string rather than a parsed object.
  if (typeof blob === "string") {
    try { blob = JSON.parse(blob); } catch { return null; }
  }

  const params: SeaportOrderParameters | null | undefined = blob?.parameters;

  if (!params) return null;

  // Guard the inner arrays — they must be real arrays to call .map() / .reduce()
  if (!Array.isArray(params.offer) || !Array.isArray(params.consideration)) return null;

  // signature may be null for unsigned orders — pass it through as-is
  const signature: string | null | undefined = blob?.signature;

  return { params, signature: signature ?? "" };
}

/** Total ERC-20 amount the fulfiller needs to pay */
function totalErc20Value(order: SeaportOrder): bigint {
  const validated = getValidatedParams(order);
  if (!validated) return 0n;
  return validated.params.consideration.reduce((acc, item) => {
    if (item.itemType === 1) return acc + BigInt(item.endAmount); // ERC20
    return acc;
  }, 0n);
}

export function useFulfillSeaportOrder(order: SeaportOrder | null) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<FulfillStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fulfillTxHash, setFulfillTxHash] = useState<`0x${string}` | undefined>();

  const isNative = order ? isNativeEth(order.paymentToken) : false;
  const paymentTokenAddress = order?.paymentToken as `0x${string}` | undefined;
  const erc20Amount = order ? totalErc20Value(order) : 0n;

  // writeContractAsync: used only for ERC-20 approval
  const { writeContractAsync } = useWriteContract();
  // sendTransactionAsync: used for the raw Seaport fulfillment calldata
  const { sendTransactionAsync } = useSendTransaction();

  // Watch for fulfill tx confirmation / revert
  const { isSuccess: fulfillConfirmed, isError: fulfillReverted } =
    useWaitForTransactionReceipt({
      hash: fulfillTxHash,
      query: { enabled: !!fulfillTxHash },
    });

  useEffect(() => {
    if (fulfillConfirmed) {
      console.log("[fulfill] ✓ fulfill tx confirmed on-chain");
      setStep("success");
    }
  }, [fulfillConfirmed]);

  useEffect(() => {
    if (fulfillReverted) {
      console.log("[fulfill] ✗ fulfill tx reverted on-chain");
      setStep("error");
      setError("Transaction reverted on-chain.");
    }
  }, [fulfillReverted]);

  // ── execute ──────────────────────────────────────────────────────────────────
  // New flow (fixes approval-to-wrong-contract + ABI encoding issues):
  //
  //   1. Fetch fulfillment_data from backend → get exact contract "to" + raw calldata
  //   2. If ERC-20: read current allowance against that EXACT contract address,
  //      approve if needed, wait for receipt imperatively
  //   3. Send raw transaction with the pre-encoded calldata from backend
  //
  // Encoding is done on the backend where all uint256 string→BigInt conversions
  // are guaranteed correct.  The frontend just forwards raw bytes.

  const execute = useCallback(async () => {
    if (!address || !order) return;
    setError(null);

    if (!publicClient) {
      setStep("error");
      setError("No public client — wallet may be on an unsupported chain.");
      return;
    }

    try {
      // Step 1: fetch calldata (this also validates the order is still live)
      console.log("[fulfill] → fetching calldata from backend");
      setStep("fulfilling");
      const fulfillment = await fetchSeaportFulfillment({
        orderHash:    order.orderHash,
        chain:        order.chain as "ethereum" | "polygon",
        buyerAddress: address,
      });
      const seaportContract = fulfillment.to as `0x${string}`;
      console.log(`[fulfill] ✓ calldata ready — to=${seaportContract} value=${fulfillment.value}`);
      console.log(`[fulfill] calldata selector=${fulfillment.data.slice(0, 10)} length=${fulfillment.data.length}`);

      // Log simulation result — this tells us the EXACT revert reason before MetaMask opens
      if (fulfillment.simulation) {
        if (fulfillment.simulation.ok) {
          console.log("[fulfill] ✓ server-side eth_call simulation PASSED");
        } else {
          console.error("[fulfill] ✗ server-side eth_call simulation REVERTED:", fulfillment.simulation.revertReason);
          // Surface revert reason to user immediately rather than letting MetaMask show "likely to fail"
          setStep("error");
          setError(`Transaction will revert: ${fulfillment.simulation.revertReason ?? "unknown reason"}`);
          return;
        }
      }

      // Step 2: ERC-20 approval — must target the ACTUAL Seaport contract
      if (!isNative && paymentTokenAddress) {
        const currentAllowance = await publicClient.readContract({
          address:      paymentTokenAddress,
          abi:          ERC20_ABI,
          functionName: "allowance",
          args:         [address, seaportContract],
        }) as bigint;

        console.log(`[fulfill] USDC allowance for ${seaportContract}: ${currentAllowance} (need ${erc20Amount})`);

        if (currentAllowance < erc20Amount) {
          console.log("[fulfill] → approving USDC for Seaport contract");
          setStep("approving-token");

          const approveHash = await writeContractAsync({
            address:      paymentTokenAddress,
            abi:          ERC20_ABI,
            functionName: "approve",
            args:         [seaportContract, erc20Amount],
          });
          console.log("[fulfill] ✓ approval tx submitted:", approveHash);
          setStep("pending-approval");

          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log("[fulfill] ✓ approval confirmed on-chain");
        } else {
          console.log("[fulfill] sufficient allowance already present — skipping approval");
        }
      }

      // Step 3: send the raw pre-encoded calldata from OpenSea/backend
      console.log("[fulfill] → sending Seaport fulfillment tx");
      setStep("fulfilling");
      const hash = await sendTransactionAsync({
        to:    seaportContract,
        data:  fulfillment.data as `0x${string}`,
        value: BigInt(fulfillment.value),
      });

      console.log("[fulfill] ✓ fulfill tx submitted:", hash);
      setFulfillTxHash(hash);
      setStep("pending-fulfill");
    } catch (err) {
      console.error("[fulfill] error:", err);
      setStep("error");
      setError(parseContractError(err));
    }
  }, [address, order, isNative, erc20Amount, paymentTokenAddress, publicClient, writeContractAsync, sendTransactionAsync]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setFulfillTxHash(undefined);
  }, []);

  return { step, execute, reset, error, fulfillTxHash };
}

function parseContractError(err: unknown): string {
  if (err instanceof Error) {
    if (
      err.message.toLowerCase().includes("user rejected") ||
      err.message.toLowerCase().includes("user denied")
    ) {
      return "Transaction cancelled.";
    }
    const first = err.message.split("\n")[0];
    return first.length > 120 ? first.slice(0, 120) + "…" : first;
  }
  return "Transaction failed.";
}
