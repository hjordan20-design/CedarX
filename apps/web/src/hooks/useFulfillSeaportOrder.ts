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
import { SEAPORT_ADDRESS, NATIVE_TOKEN, USDC_POLYGON, USDC_E_POLYGON } from "@/config/contracts";

// Optional 0x API key for higher rate limits (set VITE_ZRX_API_KEY in .env)
const ZRX_API_KEY = import.meta.env.VITE_ZRX_API_KEY as string | undefined;

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
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type FulfillStep =
  | "idle"
  | "swapping-usdc"       // auto-swapping native USDC → USDC.e before approval
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
  const [needsSwap, setNeedsSwap] = useState(false);

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
      const approvalTarget  = fulfillment.approvalTarget as `0x${string}`;
      const ZERO_ADDR       = "0x0000000000000000000000000000000000000000";
      const tokenAddr       = fulfillment.token as `0x${string}`;
      const tokenAmount     = BigInt(fulfillment.amount);
      const isErc20         = tokenAddr !== ZERO_ADDR && tokenAmount > 0n;

      console.log(
        `[fulfill] ✓ calldata ready` +
        ` to=${seaportContract} approvalTarget=${approvalTarget}` +
        ` token=${tokenAddr} amount=${tokenAmount} value=${fulfillment.value}`
      );
      console.log(`[fulfill] calldata selector=${fulfillment.data.slice(0, 10)} length=${fulfillment.data.length}`);

      // Step 2a: USDC.e auto-swap — if buyer is short on USDC.e but has native USDC,
      // swap the shortfall via 0x before proceeding to approval.
      if (isErc20 && tokenAddr.toLowerCase() === USDC_E_POLYGON.toLowerCase()) {
        const usdceBalance = await publicClient.readContract({
          address:      tokenAddr,
          abi:          ERC20_ABI,
          functionName: "balanceOf",
          args:         [address],
        }) as bigint;

        if (usdceBalance < tokenAmount) {
          const needed = tokenAmount - usdceBalance;
          const usdcBalance = await publicClient.readContract({
            address:      USDC_POLYGON,
            abi:          ERC20_ABI,
            functionName: "balanceOf",
            args:         [address],
          }) as bigint;

          if (usdcBalance < needed) {
            throw new Error(
              "Insufficient USDC balance. You need more USDC or USDC.e on Polygon."
            );
          }

          // Get swap quote from 0x
          console.log("[fulfill] USDC.e balance insufficient — swapping native USDC via 0x");
          setNeedsSwap(true);
          setStep("swapping-usdc");

          const quoteUrl = new URL("https://polygon.api.0x.org/swap/v1/quote");
          quoteUrl.searchParams.set("buyToken",     USDC_E_POLYGON);
          quoteUrl.searchParams.set("sellToken",    USDC_POLYGON);
          quoteUrl.searchParams.set("buyAmount",    needed.toString());
          quoteUrl.searchParams.set("takerAddress", address);
          const quoteHeaders: Record<string, string> = { Accept: "application/json" };
          if (ZRX_API_KEY) quoteHeaders["0x-api-key"] = ZRX_API_KEY;

          const quoteRes = await fetch(quoteUrl.toString(), { headers: quoteHeaders });
          if (!quoteRes.ok) {
            const txt = await quoteRes.text().catch(() => "");
            throw new Error(`Swap quote failed (${quoteRes.status}): ${txt.slice(0, 80)}`);
          }
          const quote = await quoteRes.json() as {
            to: string; data: string; value: string;
            sellAmount: string; allowanceTarget: string;
          };

          const swapTarget  = quote.allowanceTarget as `0x${string}`;
          const sellAmount  = BigInt(quote.sellAmount);

          // Approve native USDC for the 0x router
          const swapAllowance = await publicClient.readContract({
            address:      USDC_POLYGON,
            abi:          ERC20_ABI,
            functionName: "allowance",
            args:         [address, swapTarget],
          }) as bigint;
          if (swapAllowance < sellAmount) {
            const approveSwapHash = await writeContractAsync({
              address:      USDC_POLYGON,
              abi:          ERC20_ABI,
              functionName: "approve",
              args:         [swapTarget, sellAmount],
            });
            await publicClient.waitForTransactionReceipt({ hash: approveSwapHash });
          }

          // Execute the swap
          const swapHash = await sendTransactionAsync({
            to:    quote.to as `0x${string}`,
            data:  quote.data as `0x${string}`,
            value: BigInt(quote.value ?? "0"),
          });
          await publicClient.waitForTransactionReceipt({ hash: swapHash });
          console.log("[fulfill] ✓ USDC → USDC.e swap complete");
        }
      }

      // Step 2b: ERC-20 approval — approve the conduit (approvalTarget), not Seaport itself
      if (isErc20) {
        const currentAllowance = await publicClient.readContract({
          address:      tokenAddr,
          abi:          ERC20_ABI,
          functionName: "allowance",
          args:         [address, approvalTarget],
        }) as bigint;

        console.log(`[fulfill] allowance: token=${tokenAddr} spender=${approvalTarget} current=${currentAllowance} need=${tokenAmount}`);

        if (currentAllowance < tokenAmount) {
          console.log(`[fulfill] → approving ${tokenAddr} for ${approvalTarget}`);
          setStep("approving-token");

          const approveHash = await writeContractAsync({
            address:      tokenAddr,
            abi:          ERC20_ABI,
            functionName: "approve",
            args:         [approvalTarget, tokenAmount],
          });
          console.log("[fulfill] ✓ approval tx submitted:", approveHash);
          setStep("pending-approval");

          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log("[fulfill] ✓ approval confirmed on-chain");
        } else {
          console.log("[fulfill] sufficient allowance — skipping approval");
        }
      }

      // Step 3: send the raw pre-encoded calldata
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
    setNeedsSwap(false);
  }, []);

  return { step, execute, reset, error, fulfillTxHash, needsSwap };
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
