import type { FixedIncomeMetadata } from "@cedarx/shared-types";

/**
 * Metadata shape for an Ondo Finance RWA token.
 * Most fields are sourced from Ondo's off-chain documentation and
 * the on-chain oracle; there is no tokenURI for ERC-20 tokens.
 */
export interface OndoTokenMetadata extends FixedIncomeMetadata {
  /**
   * Ondo token symbol: "OUSG" | "USDY" | "rOUSG"
   */
  ondoSymbol: string;
  /**
   * Whether KYC / allowlist is required for transfers.
   * OUSG: true (KYC-gated), USDY: false (permissionless)
   */
  kycRequired: boolean;
  /**
   * Regulatory wrapper type used by Ondo.
   * "1940-act-fund" | "reg-s" | "reg-d" | "none"
   */
  regulatoryWrapper: "1940-act-fund" | "reg-s" | "reg-d" | "none";
}

/** Shape of an Ondo oracle price response (decoded from on-chain call) */
export interface OndoPriceData {
  /** Price in 18-decimal fixed-point (wei equivalent) */
  price: bigint;
  /** Timestamp of last price update (Unix seconds) */
  timestamp: number;
}
