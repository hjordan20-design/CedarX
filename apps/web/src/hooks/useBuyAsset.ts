import { useState, useCallback, useEffect, useRef } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { parseUnits } from "viem";
import {
  CEDARX_SWAP_ADDRESS,
  CEDARX_SWAP_ABI,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/config/contracts";

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
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
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export type BuyStep =
  | "idle"
  | "approving-usdc"
  | "pending-usdc"
  | "buying"
  | "pending-buy"
  | "success"
  | "error";

export function useBuyAsset(
  listingId: bigint | undefined,
  priceUsdc: number | undefined
) {
  const { address } = useAccount();
  const [step, setStep] = useState<BuyStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  const priceRaw =
    priceUsdc !== undefined ? parseUnits(priceUsdc.toFixed(6), USDC_DECIMALS) : 0n;

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, CEDARX_SWAP_ADDRESS],
    query: { enabled: !!address },
  });

  const { writeContractAsync } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  const { isSuccess: buyConfirmed, isError: buyReverted } =
    useWaitForTransactionReceipt({
      hash: buyTxHash,
      query: { enabled: !!buyTxHash },
    });

  // Use ref so the effect always calls the latest submitBuy without it as a dep
  const submitBuyRef = useRef<() => Promise<void>>(async () => {});

  const submitBuy = useCallback(async () => {
    if (!listingId) return;
    try {
      setStep("buying");
      const hash = await writeContractAsync({
        address: CEDARX_SWAP_ADDRESS,
        abi: CEDARX_SWAP_ABI,
        functionName: "buy",
        args: [listingId],
      });
      setBuyTxHash(hash);
      setStep("pending-buy");
    } catch (err) {
      setStep("error");
      setError(parseContractError(err));
    }
  }, [listingId, writeContractAsync]);

  submitBuyRef.current = submitBuy;

  // Advance to buy once USDC approval lands on-chain
  useEffect(() => {
    if (approveConfirmed) void submitBuyRef.current();
  }, [approveConfirmed]);

  useEffect(() => {
    if (buyConfirmed) setStep("success");
  }, [buyConfirmed]);

  useEffect(() => {
    if (buyReverted) {
      setStep("error");
      setError("Transaction reverted on-chain.");
    }
  }, [buyReverted]);

  const execute = useCallback(async () => {
    if (!address || !listingId || priceUsdc === undefined) return;
    setError(null);
    const needsApproval =
      !(allowance as bigint | undefined) || (allowance as bigint) < priceRaw;
    try {
      if (needsApproval) {
        setStep("approving-usdc");
        const hash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CEDARX_SWAP_ADDRESS, priceRaw],
        });
        setApproveTxHash(hash);
        setStep("pending-usdc");
        // submitBuy triggered by approveConfirmed effect above
      } else {
        await submitBuy();
      }
    } catch (err) {
      setStep("error");
      setError(parseContractError(err));
    }
  }, [address, listingId, priceUsdc, allowance, priceRaw, writeContractAsync, submitBuy]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setApproveTxHash(undefined);
    setBuyTxHash(undefined);
  }, []);

  return { step, execute, reset, error, approveTxHash, buyTxHash };
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
