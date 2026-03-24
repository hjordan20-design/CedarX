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
 */

import { useState, useCallback, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { parseUnits } from "viem";
import { SEAPORT_ADDRESS, SEAPORT_ABI, NATIVE_TOKEN } from "@/config/contracts";
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
  const signature: string | null | undefined = blob?.signature;

  if (!params || !signature) return null;

  // Guard the inner arrays — they must be real arrays to call .map() / .reduce()
  if (!Array.isArray(params.offer) || !Array.isArray(params.consideration)) return null;

  return { params, signature };
}

/** Sum the total ETH consideration from order parameters */
function totalEthValue(order: SeaportOrder): bigint {
  const validated = getValidatedParams(order);
  if (!validated) return 0n;
  return validated.params.consideration.reduce((acc, item) => {
    if (item.itemType === 0) return acc + BigInt(item.endAmount); // NATIVE
    return acc;
  }, 0n);
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
  const [step, setStep] = useState<FulfillStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [fulfillTxHash, setFulfillTxHash] = useState<`0x${string}` | undefined>();

  const isNative = order ? isNativeEth(order.paymentToken) : false;
  const paymentTokenAddress = order?.paymentToken as `0x${string}` | undefined;
  const erc20Amount = order ? totalErc20Value(order) : 0n;
  const ethValue    = order ? totalEthValue(order)   : 0n;

  // Check current ERC-20 allowance for Seaport
  const { data: allowance } = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, SEAPORT_ADDRESS],
    query: { enabled: !!address && !isNative && !!paymentTokenAddress },
  });

  const { writeContractAsync } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  const { isSuccess: fulfillConfirmed, isError: fulfillReverted } =
    useWaitForTransactionReceipt({
      hash: fulfillTxHash,
      query: { enabled: !!fulfillTxHash },
    });

  useEffect(() => {
    if (fulfillConfirmed) setStep("success");
  }, [fulfillConfirmed]);

  useEffect(() => {
    if (fulfillReverted) {
      setStep("error");
      setError("Transaction reverted on-chain.");
    }
  }, [fulfillReverted]);

  const submitFulfill = useCallback(async () => {
    if (!order) return;

    // Validate — covers null, JSON-string, missing .parameters, null arrays
    const validated = getValidatedParams(order);
    if (!validated) {
      setStep("error");
      setError("Order data unavailable, try again later.");
      return;
    }

    try {
      setStep("fulfilling");
      const { params, signature } = validated;
      const hash = await writeContractAsync({
        address: SEAPORT_ADDRESS,
        abi: SEAPORT_ABI,
        functionName: "fulfillOrder",
        args: [
          {
            parameters: {
              offerer:    params.offerer as `0x${string}`,
              zone:       params.zone   as `0x${string}`,
              offer: params.offer.map((o) => ({
                itemType:             o.itemType,
                token:                o.token as `0x${string}`,
                identifierOrCriteria: BigInt(o.identifierOrCriteria),
                startAmount:          BigInt(o.startAmount),
                endAmount:            BigInt(o.endAmount),
              })),
              consideration: params.consideration.map((c) => ({
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
            signature: signature as `0x${string}`,
          },
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
        value: isNative ? ethValue : 0n,
      });
      setFulfillTxHash(hash);
      setStep("pending-fulfill");
    } catch (err) {
      setStep("error");
      setError(parseContractError(err));
    }
  }, [order, isNative, ethValue, writeContractAsync]);

  // After ERC-20 approval confirms, auto-submit fulfillment
  useEffect(() => {
    if (approveConfirmed) void submitFulfill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  const execute = useCallback(async () => {
    if (!address || !order) return;
    setError(null);

    // Validate before touching the wallet so the user sees a clear message
    // instead of a raw JS error if the order blob is malformed.
    if (!getValidatedParams(order)) {
      setStep("error");
      setError("Order data unavailable, try again later.");
      return;
    }

    try {
      if (!isNative) {
        const needsApproval =
          !(allowance as bigint | undefined) || (allowance as bigint) < erc20Amount;
        if (needsApproval) {
          setStep("approving-token");
          const hash = await writeContractAsync({
            address: paymentTokenAddress!,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SEAPORT_ADDRESS, erc20Amount],
          });
          setApproveTxHash(hash);
          setStep("pending-approval");
          return;
        }
      }
      await submitFulfill();
    } catch (err) {
      setStep("error");
      setError(parseContractError(err));
    }
  }, [address, order, isNative, allowance, erc20Amount, paymentTokenAddress, writeContractAsync, submitFulfill]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setApproveTxHash(undefined);
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
