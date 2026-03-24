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
  useReadContract,
  useAccount,
  usePublicClient,
} from "wagmi";
import { parseUnits } from "viem";
import { SEAPORT_ADDRESS, SEAPORT_ABI, NATIVE_TOKEN } from "@/config/contracts";
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

  // Check current ERC-20 allowance for Seaport
  const { data: allowance } = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, SEAPORT_ADDRESS],
    query: { enabled: !!address && !isNative && !!paymentTokenAddress },
  });

  const { writeContractAsync } = useWriteContract();

  // Watch for fulfill tx confirmation / revert (still reactive — we need the
  // receipt to know when the on-chain transfer completes).
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

  // ── submitFulfill ────────────────────────────────────────────────────────────
  // Fetches live calldata from the backend (OpenSea fulfillment_data API) then
  // opens MetaMask for the Seaport fulfillOrder call.
  // Called directly from execute() after any required approval is confirmed.

  const submitFulfill = useCallback(async () => {
    if (!order || !address) {
      // Should never happen if called from execute(), but guard defensively.
      console.warn("[fulfill] submitFulfill: missing order or address", { hasOrder: !!order, address });
      return;
    }

    console.log("[fulfill] → step: fulfilling — requesting calldata from backend");
    setStep("fulfilling");

    try {
      const fulfillment = await fetchSeaportFulfillment({
        orderHash:    order.orderHash,
        chain:        order.chain as "ethereum" | "polygon",
        buyerAddress: address,
      });
      console.log("[fulfill] ✓ backend returned fulfillment data — opening MetaMask for Seaport tx");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = fulfillment.parameters as any;
      const sig    = fulfillment.signature as `0x${string}`;
      const value  = isNative ? BigInt(fulfillment.value) : 0n;

      const hash = await writeContractAsync({
        address: SEAPORT_ADDRESS,
        abi: SEAPORT_ABI,
        functionName: "fulfillOrder",
        args: [
          {
            parameters: {
              offerer:    params.offerer as `0x${string}`,
              zone:       params.zone   as `0x${string}`,
              offer: (params.offer as SeaportOrderParameters["offer"]).map((o) => ({
                itemType:             o.itemType,
                token:                o.token as `0x${string}`,
                identifierOrCriteria: BigInt(o.identifierOrCriteria),
                startAmount:          BigInt(o.startAmount),
                endAmount:            BigInt(o.endAmount),
              })),
              consideration: (params.consideration as SeaportOrderParameters["consideration"]).map((c) => ({
                itemType:             c.itemType,
                token:                c.token as `0x${string}`,
                identifierOrCriteria: BigInt(c.identifierOrCriteria),
                startAmount:          BigInt(c.startAmount),
                endAmount:            BigInt(c.endAmount),
                recipient:            c.recipient as `0x${string}`,
              })),
              orderType:                       params.orderType,
              startTime:                       BigInt(params.startTime),
              endTime:                         BigInt(params.endTime),
              zoneHash:                        params.zoneHash as `0x${string}`,
              salt:                            BigInt(params.salt),
              conduitKey:                      params.conduitKey as `0x${string}`,
              totalOriginalConsiderationItems: BigInt(params.totalOriginalConsiderationItems),
            },
            signature: sig,
          },
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
        value,
      });

      console.log("[fulfill] ✓ fulfill tx submitted:", hash);
      setFulfillTxHash(hash);
      setStep("pending-fulfill");
    } catch (err) {
      console.error("[fulfill] submitFulfill error:", err);
      setStep("error");
      setError(parseContractError(err));
    }
  }, [order, address, isNative, writeContractAsync]);

  // ── execute ──────────────────────────────────────────────────────────────────
  // Main entry point.  For ERC-20 orders: approve → inline-wait for receipt →
  // fulfillment.  For native ETH: go straight to fulfillment.
  //
  // Waiting for the approval receipt is done imperatively with
  // publicClient.waitForTransactionReceipt() rather than via a useEffect bridge
  // so the entire flow is one linear async chain with no stale-closure risk.

  const execute = useCallback(async () => {
    if (!address || !order) return;
    console.log("[fulfill] execute — isNative:", isNative, "erc20Amount:", erc20Amount.toString(), "allowance:", String(allowance));
    setError(null);

    // Validate stored order has usable parameter arrays (signature may be null —
    // it is resolved at fulfillment time via the backend).
    if (!getValidatedParams(order)) {
      setStep("error");
      setError("Order data unavailable, try again later.");
      return;
    }

    try {
      if (!isNative) {
        const needsApproval =
          !(allowance as bigint | undefined) || (allowance as bigint) < erc20Amount;
        console.log("[fulfill] needsApproval:", needsApproval);

        if (needsApproval) {
          console.log("[fulfill] → step: approving-token");
          setStep("approving-token");

          const approveHash = await writeContractAsync({
            address: paymentTokenAddress!,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SEAPORT_ADDRESS, erc20Amount],
          });
          console.log("[fulfill] ✓ approval tx submitted:", approveHash);
          setStep("pending-approval");

          if (!publicClient) throw new Error("No public client — wallet may be on an unsupported chain");
          console.log("[fulfill] waiting for approval receipt...");
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log("[fulfill] ✓ approval confirmed");
        }
      }

      await submitFulfill();
    } catch (err) {
      console.error("[fulfill] execute error:", err);
      setStep("error");
      setError(parseContractError(err));
    }
  }, [address, order, isNative, allowance, erc20Amount, paymentTokenAddress, writeContractAsync, submitFulfill, publicClient]);

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
