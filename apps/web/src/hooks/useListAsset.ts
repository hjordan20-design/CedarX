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
  USDC_DECIMALS,
} from "@/config/contracts";
import type { TokenStandard } from "@/lib/types";

const APPROVAL_ABI = [
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

export type ListStep =
  | "idle"
  | "approving-nft"
  | "pending-nft-approval"
  | "listing"
  | "pending-list"
  | "success"
  | "error";

export interface UseListAssetParams {
  contractAddress: `0x${string}`;
  tokenId: string;
  tokenStandard: TokenStandard;
  priceUsdc: number | null;
}

export function useListAsset({
  contractAddress,
  tokenId,
  tokenStandard,
  priceUsdc,
}: UseListAssetParams) {
  const { address } = useAccount();
  const [step, setStep] = useState<ListStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [listTxHash, setListTxHash] = useState<`0x${string}` | undefined>();

  const priceRaw =
    priceUsdc !== null ? parseUnits(priceUsdc.toFixed(6), USDC_DECIMALS) : 0n;
  const standard = tokenStandard === "ERC-721" ? 0 : 1;

  const { data: isApproved } = useReadContract({
    address: contractAddress,
    abi: APPROVAL_ABI,
    functionName: "isApprovedForAll",
    args: [address as `0x${string}`, CEDARX_SWAP_ADDRESS],
    query: { enabled: !!address },
  });

  const { writeContractAsync } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  const { isSuccess: listConfirmed, isError: listReverted } =
    useWaitForTransactionReceipt({
      hash: listTxHash,
      query: { enabled: !!listTxHash },
    });

  const submitListRef = useRef<() => Promise<void>>(async () => {});

  const submitList = useCallback(async () => {
    if (priceUsdc === null || !tokenId) return;
    try {
      setStep("listing");
      const hash = await writeContractAsync({
        address: CEDARX_SWAP_ADDRESS,
        abi: CEDARX_SWAP_ABI,
        functionName: "list",
        args: [contractAddress, BigInt(tokenId), 1n, priceRaw, standard],
      });
      setListTxHash(hash);
      setStep("pending-list");
    } catch (err) {
      setStep("error");
      setError(parseContractError(err));
    }
  }, [contractAddress, tokenId, priceUsdc, priceRaw, standard, writeContractAsync]);

  submitListRef.current = submitList;

  useEffect(() => {
    if (approveConfirmed) void submitListRef.current();
  }, [approveConfirmed]);

  useEffect(() => {
    if (listConfirmed) setStep("success");
  }, [listConfirmed]);

  useEffect(() => {
    if (listReverted) {
      setStep("error");
      setError("Listing transaction reverted.");
    }
  }, [listReverted]);

  const execute = useCallback(async () => {
    if (!address || priceUsdc === null) return;
    setError(null);
    try {
      if (!isApproved) {
        setStep("approving-nft");
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: APPROVAL_ABI,
          functionName: "setApprovalForAll",
          args: [CEDARX_SWAP_ADDRESS, true],
        });
        setApproveTxHash(hash);
        setStep("pending-nft-approval");
      } else {
        await submitList();
      }
    } catch (err) {
      setStep("error");
      setError(parseContractError(err));
    }
  }, [address, priceUsdc, isApproved, contractAddress, writeContractAsync, submitList]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setApproveTxHash(undefined);
    setListTxHash(undefined);
  }, []);

  return { step, execute, reset, error, approveTxHash, listTxHash };
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
