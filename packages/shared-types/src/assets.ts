import type { ProtocolId, ChainId } from "./protocols";

/**
 * A tokenized real-world asset as represented in CedarX
 */
export interface RWAsset {
  id: string; // Internal CedarX ID
  protocolId: ProtocolId;
  chainId: ChainId;
  tokenAddress: `0x${string}`;
  tokenId?: string; // For NFT-based tokens (ERC-721/1155)
  name: string;
  symbol?: string;
  assetType: AssetType;
  metadata: AssetMetadata;
  valuation?: AssetValuation;
}

export type AssetType =
  | "single-family-home"
  | "multi-family"
  | "commercial"
  | "land"
  | "treasury-bond"
  | "money-market-fund";

/**
 * Core metadata common to all RWA types
 */
export interface AssetMetadata {
  description?: string;
  imageUri?: string;
  externalUri?: string;
  legalDocumentUri?: string;
  // Protocol-specific metadata stored as key-value
  attributes?: MetadataAttribute[];
}

export interface MetadataAttribute {
  traitType: string;
  value: string | number | boolean;
  displayType?: "number" | "boost_number" | "boost_percentage" | "date";
}

/**
 * Real estate specific metadata
 */
export interface RealEstateMetadata extends AssetMetadata {
  propertyAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  propertyType?: AssetType;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  lotSize?: number;
  parcelNumber?: string; // APN
}

/**
 * Fixed income / treasury metadata
 */
export interface FixedIncomeMetadata extends AssetMetadata {
  underlyingAsset?: string; // e.g. "US Treasury Bills"
  yield?: number; // Current APY as decimal
  managementFee?: number; // Annual fee as decimal
  minimumInvestment?: string; // In USD
  custodian?: string;
  fundAdmin?: string;
}

/**
 * Asset valuation snapshot
 */
export interface AssetValuation {
  navPerToken: string; // As string to avoid floating point
  totalValue: string;
  currency: "USD" | "USDC" | "DAI";
  lastUpdated: number; // Unix timestamp
  source: "oracle" | "manual" | "api";
}
