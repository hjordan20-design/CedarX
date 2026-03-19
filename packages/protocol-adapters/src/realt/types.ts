import type { RealEstateMetadata } from "@cedarx/shared-types";

/**
 * A single property token entry as returned by the RealT community API
 * (GET /v1/token).
 */
export interface RealTApiToken {
  /** Full token name, e.g. "RealToken S 11201 Albany Ave Detroit MI 48202" */
  fullName: string;
  /** Short symbol, e.g. "REALTOKEN-S-11201-ALBANY-AVE-DETROIT-MI-48202" */
  shortName: string;
  /** ERC-20 contract address on Ethereum mainnet */
  ethereumContract: string;
  /** ERC-20 contract address on Gnosis Chain (may differ from Ethereum) */
  gnosisContract: string;
  /** Token price in USD (current RealT valuation per token) */
  tokenPrice: number;
  /** Total token supply for this property */
  totalTokens: number;
  /** Total property value in USD */
  totalValue: number;
  /** Gross annual rental yield as a percentage */
  annualPercentageYield: number;
  /** Monthly net rent per token in USD */
  netRentMonthPerToken: number;
  /** Rental distribution currency: "USDC" on Ethereum, "xDAI" on Gnosis */
  rentedUnits: number;
  totalUnits: number;
  propertyType: number; // 1 = SFR, 2 = Multi-family, etc.
  coordinate: { lat: string; lng: string };
  imageLink: string[];
  propertyStories?: number;
  squareFeet?: number;
  lotSize?: number;
  bedroomBath?: string;
  constructionYear?: number;
  neighborhood?: string;
  propertyManagement?: string;
  // Raw street / city fields from the API
  fullAddress: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Normalized RealT property metadata used internally by CedarX.
 */
export interface RealTAssetMetadata extends RealEstateMetadata {
  /** Monthly rent per token in USD */
  monthlyRentPerToken: string;
  /** Annual gross yield (0–1 decimal) */
  annualYield: number;
  /** Number of rented units out of total units */
  occupancy: { rented: number; total: number };
  /** ERC-20 decimals (always 18 for RealT tokens) */
  decimals: 18;
}

/** RealT property type codes returned by their API */
export const REALT_PROPERTY_TYPE: Record<number, string> = {
  1: "single-family-home",
  2: "multi-family",
  3: "duplex",
  4: "condominium",
  6: "mixed-use",
  8: "commercial",
  9: "sfr-portfolio",
};
