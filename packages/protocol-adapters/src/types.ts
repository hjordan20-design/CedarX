import type { RWAsset } from "@cedarx/shared-types";

/**
 * Common interface all protocol adapters must implement
 */
export interface ProtocolAdapter {
  readonly protocolId: string;

  /** Fetch all assets available from this protocol */
  fetchAssets(): Promise<RWAsset[]>;

  /** Fetch a single asset by its token address (and optional token ID) */
  fetchAsset(tokenAddress: string, tokenId?: string): Promise<RWAsset | null>;

  /** Get the current NAV/price per token */
  fetchValuation(tokenAddress: string, tokenId?: string): Promise<string | null>;
}
