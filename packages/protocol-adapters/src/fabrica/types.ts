import type { RealEstateMetadata } from "@cedarx/shared-types";

/**
 * On-chain token data returned by Fabrica's ERC-721 contract.
 * Retrieved via `tokenURI(tokenId)` → IPFS JSON.
 */
export interface FabricaTokenMetadata extends RealEstateMetadata {
  /** Assessor's Parcel Number — primary on-chain identifier for the land */
  apn: string;
  /** State abbreviation where the parcel is located */
  state: string;
  /** Arweave URL for the recorded deed / title document */
  deedUri?: string;
  /** Arweave URL for title insurance policy, if present */
  titleInsuranceUri?: string;
  /** Legal entity (LLC) that holds title on behalf of the token holder */
  holdingEntity?: string;
}

/**
 * The JSON shape returned by Fabrica's token URI endpoint.
 * Fields match OpenSea's metadata standard plus Fabrica extensions.
 */
export interface FabricaTokenURIResponse {
  name: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  // Fabrica extensions
  apn?: string;
  property_address?: string;
  deed_url?: string;
  title_insurance_url?: string;
  holding_entity?: string;
}
