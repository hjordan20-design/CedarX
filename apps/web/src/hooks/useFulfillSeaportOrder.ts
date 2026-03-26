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
 * USDC.e auto-swap path (Polygon only)
 * -------------------------------------
 * Seaport listings on Polygon use USDC.e (bridged USDC, legacy contract).
 * Many wallets hold native USDC (Circle CCTP contract) instead.  When the
 * buyer has insufficient USDC.e but enough native USDC, this hook calls the
 * 0x Swap API to convert the shortfall before proceeding to approval.
 *
 * 0x API setup:
 *   - Endpoint: https://polygon.api.0x.org/swap/v1/quote
 *   - An API key (VITE_ZRX_API_KEY) is strongly recommended — without one
 *     the free tier may return 400/403 depending on rate limits.
 *   - Register free at https://0x.org/docs/introduction/getting-started
 *   - If the API is unavailable or returns an error the hook falls back
 *     gracefully: it sets step="error" with a human-readable message telling
 *     the buyer to swap manually (e.g. via Uniswap on Polygon).
 *
 * Approval → fulfillment bridge
 * ------------------------------
 * Uses publicClient.waitForTransactionReceipt() inline inside execute() so
 * the entire flow is one linear async chain with no cross-effect handoff.
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
import { fetchSeaportFulfillment } from "@/lib/api";
import type { SeaportOrder, SeaportOrderParameters } from "@/lib/types";

// Optional 0x API key for higher rate limits (set VITE_ZRX_API_KEY in .env).
// Without a key the free tier may reject requests — swap falls back gracefully.
const ZRX_API_KEY = import.meta.env.VITE_ZRX_API_KEY as string | undefined;
const USDC_DECIMALS = 6;

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
  | "swapping-usdc"     // fetching 0x quote + executing swap
  | "approving-token"   // ERC-20 approval wallet prompt
  | "pending-approval"  // waiting for approval tx on-chain
  | "fulfilling"        // Seaport fulfillment wallet prompt
  | "pending-fulfill"   // waiting for fulfillment tx on-chain
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

/** Format raw token base-units as a human-readable decimal string (e.g. "12.50") */
function fmtToken(raw: bigint, decimals = USDC_DECIMALS): string {
  const factor = 10 ** decimals;
  return (Number(raw) / factor).toFixed(2);
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
  // Flow:
  //   1. Fetch fulfillment calldata from backend
  //   2. [USDC.e orders on Polygon] Check balances; auto-swap native USDC via 0x if short
  //   3. ERC-20 approval (if allowance insufficient)
  //   4. Send raw fulfillment calldata

  const execute = useCallback(async () => {
    if (!address || !order) return;
    setError(null);

    if (!publicClient) {
      setStep("error");
      setError("No public client — wallet may be on an unsupported chain.");
      return;
    }

    try {
      // ── Step 1: fetch calldata ──────────────────────────────────────────────
      console.log("[fulfill] → fetching calldata from backend", {
        orderHash: order.orderHash,
        chain: order.chain,
        buyer: address,
      });
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

      console.log("[fulfill] ✓ calldata ready", {
        to:             seaportContract,
        approvalTarget,
        token:          tokenAddr,
        amount:         tokenAmount.toString(),
        value:          fulfillment.value,
        calldataLen:    fulfillment.data.length,
        selector:       fulfillment.data.slice(0, 10),
      });

      // ── Step 2: USDC.e auto-swap (Polygon USDC.e orders only) ──────────────
      // If buyer has insufficient USDC.e but holds native USDC, swap the shortfall
      // via 0x before proceeding.  If 0x is unavailable, falls back gracefully.
      if (isErc20 && tokenAddr.toLowerCase() === USDC_E_POLYGON.toLowerCase()) {
        console.log(`[swap] checking USDC.e balance for ${address}`);
        const usdceBalance = await publicClient.readContract({
          address:      tokenAddr,
          abi:          ERC20_ABI,
          functionName: "balanceOf",
          args:         [address],
        }) as bigint;

        console.log(`[swap] USDC.e balance: ${fmtToken(usdceBalance)} — need: ${fmtToken(tokenAmount)} — shortfall: ${tokenAmount > usdceBalance ? fmtToken(tokenAmount - usdceBalance) : "0"}`);

        if (usdceBalance < tokenAmount) {
          const needed = tokenAmount - usdceBalance;

          console.log(`[swap] checking native USDC balance for ${address}`);
          const usdcBalance = await publicClient.readContract({
            address:      USDC_POLYGON,
            abi:          ERC20_ABI,
            functionName: "balanceOf",
            args:         [address],
          }) as bigint;
          console.log(`[swap] native USDC balance: ${fmtToken(usdcBalance)} — need for swap: ${fmtToken(needed)}`);

          if (usdcBalance < needed) {
            throw new Error(
              `Insufficient balance. Need ${fmtToken(tokenAmount)} USDC.e ` +
              `(have ${fmtToken(usdceBalance)}) and only ${fmtToken(usdcBalance)} native USDC available.`
            );
          }

          setNeedsSwap(true);
          setStep("swapping-usdc");

          // ── 0x quote ────────────────────────────────────────────────────────
          const quoteUrl = new URL("https://polygon.api.0x.org/swap/v1/quote");
          quoteUrl.searchParams.set("buyToken",     USDC_E_POLYGON);
          quoteUrl.searchParams.set("sellToken",    USDC_POLYGON);
          quoteUrl.searchParams.set("buyAmount",    needed.toString());
          quoteUrl.searchParams.set("takerAddress", address);
          const quoteHeaders: Record<string, string> = { Accept: "application/json" };
          if (ZRX_API_KEY) quoteHeaders["0x-api-key"] = ZRX_API_KEY;

          console.log(`[swap] → GET 0x quote: buyAmount=${fmtToken(needed)} USDC.e, sellToken=USDC`, {
            url:       quoteUrl.toString().split("?")[0],
            hasApiKey: !!ZRX_API_KEY,
          });

          let quote: {
            to:              string;
            data:            string;
            value:           string;
            sellAmount:      string;
            allowanceTarget: string;
          };

          try {
            const quoteRes = await fetch(quoteUrl.toString(), { headers: quoteHeaders });
            const rawBody  = await quoteRes.text();

            if (!quoteRes.ok) {
              console.warn(`[swap] 0x API ${quoteRes.status}:`, rawBody.slice(0, 400));
              // Surface a helpful manual-swap fallback message rather than crashing.
              throw new Error(
                `Auto-swap unavailable (0x ${quoteRes.status}). ` +
                `Swap ${fmtToken(needed)} USDC → USDC.e on Polygon ` +
                `(Uniswap / Paraswap), then click Retry.`
              );
            }

            quote = JSON.parse(rawBody) as typeof quote;
            console.log("[swap] ✓ 0x quote received", {
              sellAmount:      quote.sellAmount,
              allowanceTarget: quote.allowanceTarget,
              to:              quote.to,
            });
          } catch (fetchErr) {
            // Re-throw our own formatted errors as-is;
            // wrap unexpected fetch/network errors with a friendly message.
            if (fetchErr instanceof Error &&
                fetchErr.message.startsWith("Auto-swap unavailable")) {
              throw fetchErr;
            }
            console.warn("[swap] 0x API network error:", fetchErr);
            throw new Error(
              `Auto-swap unavailable (network error). ` +
              `Swap ${fmtToken(needed)} USDC → USDC.e on Polygon ` +
              `(Uniswap / Paraswap), then click Retry.`
            );
          }

          const swapTarget = quote.allowanceTarget as `0x${string}`;
          const sellAmount = BigInt(quote.sellAmount);

          // ── Approve USDC for the 0x router ──────────────────────────────────
          console.log(`[swap] checking USDC allowance: spender=${swapTarget}`);
          const swapAllowance = await publicClient.readContract({
            address:      USDC_POLYGON,
            abi:          ERC20_ABI,
            functionName: "allowance",
            args:         [address, swapTarget],
          }) as bigint;
          console.log(`[swap] USDC allowance: current=${fmtToken(swapAllowance)}, needed=${fmtToken(sellAmount)}`);

          if (swapAllowance < sellAmount) {
            console.log(`[swap] → approving ${fmtToken(sellAmount)} USDC for 0x router (${swapTarget})`);
            const approveSwapHash = await writeContractAsync({
              address:      USDC_POLYGON,
              abi:          ERC20_ABI,
              functionName: "approve",
              args:         [swapTarget, sellAmount],
            });
            console.log(`[swap] ✓ USDC approve tx submitted: ${approveSwapHash}`);
            await publicClient.waitForTransactionReceipt({ hash: approveSwapHash });
            console.log(`[swap] ✓ USDC approve confirmed on-chain`);
          } else {
            console.log(`[swap] sufficient USDC allowance — skipping approval`);
          }

          // ── Execute swap ─────────────────────────────────────────────────────
          console.log(`[swap] → executing swap tx`, { to: quote.to, value: quote.value });
          const swapHash = await sendTransactionAsync({
            to:    quote.to    as `0x${string}`,
            data:  quote.data  as `0x${string}`,
            value: BigInt(quote.value ?? "0"),
          });
          console.log(`[swap] ✓ swap tx submitted: ${swapHash}`);
          await publicClient.waitForTransactionReceipt({ hash: swapHash });
          console.log(`[swap] ✓ USDC → USDC.e swap confirmed on-chain`);
        } else {
          console.log(`[swap] sufficient USDC.e balance — no swap needed`);
        }
      }

      // ── Step 3: ERC-20 approval ─────────────────────────────────────────────
      if (isErc20) {
        const currentAllowance = await publicClient.readContract({
          address:      tokenAddr,
          abi:          ERC20_ABI,
          functionName: "allowance",
          args:         [address, approvalTarget],
        }) as bigint;

        console.log(`[fulfill] allowance check`, {
          token:   tokenAddr,
          spender: approvalTarget,
          current: currentAllowance.toString(),
          need:    tokenAmount.toString(),
        });

        if (currentAllowance < tokenAmount) {
          console.log(`[fulfill] → requesting approval: ${fmtToken(tokenAmount)} of ${tokenAddr}`);
          setStep("approving-token");

          const approveHash = await writeContractAsync({
            address:      tokenAddr,
            abi:          ERC20_ABI,
            functionName: "approve",
            args:         [approvalTarget, tokenAmount],
          });
          console.log(`[fulfill] ✓ approval tx submitted: ${approveHash}`);
          setStep("pending-approval");

          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log(`[fulfill] ✓ approval confirmed on-chain`);
        } else {
          console.log(`[fulfill] sufficient allowance — skipping approval`);
        }
      }

      // ── Step 4: send Seaport fulfillment ────────────────────────────────────
      console.log(`[fulfill] → sending Seaport fulfillment tx`, {
        to:    seaportContract,
        value: fulfillment.value,
      });
      setStep("fulfilling");

      const hash = await sendTransactionAsync({
        to:    seaportContract,
        data:  fulfillment.data as `0x${string}`,
        value: BigInt(fulfillment.value),
      });

      console.log(`[fulfill] ✓ fulfill tx submitted: ${hash}`);
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
    // Allow longer messages for auto-swap fallback instructions (up to 200 chars)
    return first.length > 200 ? first.slice(0, 200) + "…" : first;
  }
  return "Transaction failed.";
}
