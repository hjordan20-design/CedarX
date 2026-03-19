import type { RWAsset } from "./assets";
import type { ChainId } from "./protocols";

/**
 * A listing on the CedarX marketplace
 */
export interface Listing {
  id: string;
  asset: RWAsset;
  seller: `0x${string}`;
  price: string; // In payment token units
  paymentToken: `0x${string}`;
  chainId: ChainId;
  status: ListingStatus;
  createdAt: number;
  expiresAt?: number;
}

export type ListingStatus = "active" | "sold" | "cancelled" | "expired";

/**
 * A completed trade
 */
export interface Trade {
  id: string;
  listingId: string;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  price: string;
  paymentToken: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: number;
  timestamp: number;
}
