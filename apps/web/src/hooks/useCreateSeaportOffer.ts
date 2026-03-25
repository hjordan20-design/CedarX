/**
 * useCreateSeaportOffer
 *
 * Creates a Seaport offer where the connected buyer offers USDC.e (Polygon) or
 * USDC (Ethereum) in exchange for a specific NFT.  The seller can fill the offer
 * on CedarX, OpenSea, or any Seaport-compatible marketplace.
 *
 * Offer order structure (buyer is offerer):
 *   offer         = [ERC-20 USDC, totalAmount]
 *   consideration = [NFT → buyer, ERC-20 USDC fee → CedarX fee wallet]
 *
 * The seller (fulfiller) receives: totalAmount − feeAmount.
 * A 1.5% CedarX fee is encoded as the second consideration item.
 *
 * No on-chain transaction is needed — the offer is signed off-chain (EIP-712).
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
  USDC_MAINNET,
  USDC_E_POLYGON,
} from "@/config/contracts";
import { postSeaportOffer } from "@/lib/api";
import type { TokenStandard } from "@/lib/types";

const CEDARX_FEE_BPS = 150; // 1.5%
const ZERO_BYTES32   = "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS   = "0x0000000000000000000000000000000000000000";
const FEE_WALLET     = (import.meta.env.VITE_CEDARX_FEE_WALLET || "") as `0x${string}`;
const USDC_DECIMALS  = 6;

export type CreateOfferStep =
  | "idle"
  | "signing"
  | "posting"
  | "success"
  | "error";

export interface CreateOfferParams {
  assetId:         string;
  contractAddress: `0x${string}`;
  tokenId:         string;
  tokenStandard:   TokenStandard;
  chain:           "ethereum" | "polygon";
  /** Offer amount in USDC, human-readable decimal string, e.g. "500.00" */
  amountHuman:     string;
  /** Duration in seconds */
  durationSeconds: number;
}

export function useCreateSeaportOffer() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [step, setStep]         = useState<CreateOfferStep>("idle");
  const [error, setError]       = useState<string | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);

  // Read the buyer's Seaport counter (required for EIP-712 signature)
  const { data: counter } = useReadContract({
    address: SEAPORT_ADDRESS,
    abi:     SEAPORT_ABI,
    functionName: "getCounter",
    args:    address ? [address] : undefined!,
    query:   { enabled: !!address },
  });

  const { signTypedDataAsync } = useSignTypedData();

  const execute = useCallback(async (params: CreateOfferParams) => {
    if (!address || counter === undefined) return;
    if (!FEE_WALLET) {
      setStep("error");
      setError("VITE_CEDARX_FEE_WALLET is not configured.");
      return;
    }

    setError(null);
    setOrderHash(null);

    try {
      setStep("signing");

      const { assetId, contractAddress, tokenId, tokenStandard, chain, amountHuman, durationSeconds } = params;

      const startTime = BigInt(Math.floor(Date.now() / 1000));
      const endTime   = startTime + BigInt(durationSeconds);

      // USDC.e on Polygon, native USDC on Ethereum — both use 6 decimals
      const usdcAddress = chain === "polygon" ? USDC_E_POLYGON : USDC_MAINNET;
      const usdcSymbol  = chain === "polygon" ? "USDC.e" : "USDC";

      const totalRaw  = parseUnits(amountHuman, USDC_DECIMALS);
      const feeAmount = totalRaw * BigInt(CEDARX_FEE_BPS) / 10000n;

      const isERC721   = tokenStandard === "ERC-721";
      const nftItemType = isERC721 ? SEAPORT_ITEM_TYPE.ERC721 : SEAPORT_ITEM_TYPE.ERC1155;

      const orderComponents = {
        offerer:   address,
        zone:      ZERO_ADDRESS as `0x${string}`,
        // Buyer offers USDC.e / USDC
        offer: [
          {
            itemType:             SEAPORT_ITEM_TYPE.ERC20,
            token:                usdcAddress,
            identifierOrCriteria: 0n,
            startAmount:          totalRaw,
            endAmount:            totalRaw,
          },
        ],
        // NFT goes to buyer; 1.5% fee goes to CedarX
        consideration: [
          {
            itemType:             nftItemType,
            token:                contractAddress,
            identifierOrCriteria: BigInt(tokenId),
            startAmount:          1n,
            endAmount:            1n,
            recipient:            address,
          },
          {
            itemType:             SEAPORT_ITEM_TYPE.ERC20,
            token:                usdcAddress,
            identifierOrCriteria: 0n,
            startAmount:          feeAmount,
            endAmount:            feeAmount,
            recipient:            FEE_WALLET,
          },
        ],
        orderType:  SEAPORT_ORDER_TYPE.FULL_OPEN,
        startTime,
        endTime,
        zoneHash:   ZERO_BYTES32 as `0x${string}`,
        salt:       BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
        conduitKey: ZERO_BYTES32 as `0x${string}`,
        counter:    counter as bigint,
      };

      const signature = await signTypedDataAsync({
        domain: {
          name:              "Seaport",
          version:           "1.5",
          chainId,
          verifyingContract: SEAPORT_ADDRESS,
        },
        types:       SEAPORT_EIP712_TYPES,
        primaryType: "OrderComponents",
        message:     orderComponents,
      });

      setStep("posting");

      const expiresAt = new Date(Number(endTime) * 1000).toISOString();

      const result = await postSeaportOffer({
        assetId,
        chain,
        offererAddress:       address,
        amount:               totalRaw.toString(),
        paymentToken:         usdcAddress,
        paymentTokenSymbol:   usdcSymbol,
        paymentTokenDecimals: USDC_DECIMALS,
        durationSeconds,
        expiresAt,
        orderParameters: {
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

/** JSON replacer that converts BigInt to string */
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
  return "Failed to submit offer.";
}
