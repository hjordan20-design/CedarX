/**
 * useCreateSeaportListing
 *
 * Creates a Seaport listing for an NFT the connected wallet owns.
 *
 * Flow:
 *   1. Fetch the seller's current Seaport counter (for EIP-712 signature)
 *   2. Build the Seaport OrderComponents including the 1.5% CedarX fee
 *   3. Request an EIP-712 signTypedData signature from the seller's wallet
 *   4. POST the signed order to the CedarX API, which stores it locally
 *      and forwards it to OpenSea
 *
 * No on-chain transaction is needed — Seaport orders are signed off-chain.
 */

import { useState, useCallback } from "react";
import { useReadContract, useSignTypedData, useAccount, useChainId } from "wagmi";
import { parseUnits } from "viem";
import {
  SEAPORT_ADDRESS,
  SEAPORT_ABI,
  SEAPORT_EIP712_TYPES,
  SEAPORT_ITEM_TYPE,
  SEAPORT_ORDER_TYPE,
  NATIVE_TOKEN,
} from "@/config/contracts";
import { postSeaportListing } from "@/lib/api";
import type { TokenStandard } from "@/lib/types";

const CEDARX_FEE_BPS = 150; // 1.5%
const ZERO_BYTES32   = "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS   = "0x0000000000000000000000000000000000000000";

export type CreateListingStep =
  | "idle"
  | "signing"
  | "posting"
  | "success"
  | "error";

export interface CreateListingParams {
  assetId:        string;
  contractAddress:`0x${string}`;
  tokenId:        string;
  tokenStandard:  TokenStandard;
  paymentToken:   `0x${string}`;   // token address; use NATIVE_TOKEN for ETH
  paymentTokenSymbol:   string;
  paymentTokenDecimals: number;
  /** Price as a human-readable decimal string, e.g. "1.5" for 1.5 ETH */
  priceHuman:     string;
  /** Duration in seconds from now (default: 30 days) */
  durationSeconds?: number;
  feeWallet:      `0x${string}`;   // CedarX fee recipient
}

export function useCreateSeaportListing() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [step, setStep]       = useState<CreateListingStep>("idle");
  const [error, setError]     = useState<string | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);

  // Read the seller's Seaport counter (required for order signature)
  const { data: counter } = useReadContract({
    address: SEAPORT_ADDRESS,
    abi: SEAPORT_ABI,
    functionName: "getCounter",
    args: address ? [address] : undefined!,
    query: { enabled: !!address },
  });

  const { signTypedDataAsync } = useSignTypedData();

  const execute = useCallback(async (params: CreateListingParams) => {
    if (!address || counter === undefined) return;
    setError(null);
    setOrderHash(null);

    try {
      setStep("signing");

      const {
        assetId, contractAddress, tokenId, tokenStandard,
        paymentToken, paymentTokenSymbol, paymentTokenDecimals,
        priceHuman, feeWallet,
      } = params;

      const durationSeconds = params.durationSeconds ?? 30 * 24 * 60 * 60;
      const startTime = BigInt(Math.floor(Date.now() / 1000));
      const endTime   = startTime + BigInt(durationSeconds);

      // Parse price to raw units
      const priceRaw = parseUnits(priceHuman, paymentTokenDecimals);

      // CedarX fee = 1.5% of total; seller receives the rest
      const feeAmount    = priceRaw * BigInt(CEDARX_FEE_BPS) / 10000n;
      const sellerAmount = priceRaw - feeAmount;

      const isNFT721  = tokenStandard === "ERC-721";
      const offerItemType = isNFT721 ? SEAPORT_ITEM_TYPE.ERC721 : SEAPORT_ITEM_TYPE.ERC1155;

      const isNativePayment = paymentToken.toLowerCase() === NATIVE_TOKEN.toLowerCase();
      const payItemType = isNativePayment ? SEAPORT_ITEM_TYPE.NATIVE : SEAPORT_ITEM_TYPE.ERC20;

      // The payment token address for the EIP-712 types:
      // Seaport uses 0x0…0 for native ETH in consideration items
      const payTokenAddr = isNativePayment ? ZERO_ADDRESS : paymentToken;

      const orderComponents = {
        offerer:       address,
        zone:          ZERO_ADDRESS as `0x${string}`,
        offer: [
          {
            itemType:             offerItemType,
            token:                contractAddress,
            identifierOrCriteria: BigInt(tokenId),
            startAmount:          1n,
            endAmount:            1n,
          },
        ],
        consideration: [
          {
            itemType:             payItemType,
            token:                payTokenAddr as `0x${string}`,
            identifierOrCriteria: 0n,
            startAmount:          sellerAmount,
            endAmount:            sellerAmount,
            recipient:            address,
          },
          {
            itemType:             payItemType,
            token:                payTokenAddr as `0x${string}`,
            identifierOrCriteria: 0n,
            startAmount:          feeAmount,
            endAmount:            feeAmount,
            recipient:            feeWallet,
          },
        ],
        orderType:     SEAPORT_ORDER_TYPE.FULL_OPEN,
        startTime,
        endTime,
        zoneHash:      ZERO_BYTES32 as `0x${string}`,
        salt:          BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
        conduitKey:    ZERO_BYTES32 as `0x${string}`,
        counter:       counter as bigint,
      };

      const signature = await signTypedDataAsync({
        domain: {
          name:              "Seaport",
          version:           "1.5",
          chainId,
          verifyingContract: SEAPORT_ADDRESS,
        },
        types:   SEAPORT_EIP712_TYPES,
        primaryType: "OrderComponents",
        message: orderComponents,
      });

      setStep("posting");

      const expiresAt = new Date(Number(endTime) * 1000).toISOString();
      const chain = chainId === 137 ? "polygon" : "ethereum";

      const result = await postSeaportListing({
        assetId,
        chain,
        sellerAddress:        address,
        price:                priceRaw.toString(),
        paymentToken:         payTokenAddr,
        paymentTokenSymbol,
        paymentTokenDecimals,
        expiration:           expiresAt,
        orderParameters: {
          // Remove BigInts for JSON serialisation
          parameters: JSON.parse(JSON.stringify(orderComponents, bigintReplacer)),
          signature,
        },
      });

      setOrderHash(result.orderHash);
      setStep("success");
    } catch (err) {
      setStep("error");
      setError(parseError(err));
    }
  }, [address, counter, chainId, signTypedDataAsync]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setOrderHash(null);
  }, []);

  return { step, execute, reset, error, orderHash };
}

/** JSON replacer that converts BigInt to string (needed for JSON.stringify) */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

function parseError(err: unknown): string {
  if (err instanceof Error) {
    if (
      err.message.toLowerCase().includes("user rejected") ||
      err.message.toLowerCase().includes("user denied")
    ) {
      return "Signature cancelled.";
    }
    const first = err.message.split("\n")[0];
    return first.length > 120 ? first.slice(0, 120) + "…" : first;
  }
  return "Failed to create listing.";
}
