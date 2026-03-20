/**
 * Supported RWA protocol identifiers
 */
export type ProtocolId = "fabrica" | "ondo" | "realt";

/**
 * Supported blockchain networks
 */
export type ChainId = 1 | 100 | 137 | 42161; // Ethereum, Gnosis, Polygon, Arbitrum

export const CHAIN_NAMES: Record<ChainId, string> = {
  1: "Ethereum Mainnet",
  100: "Gnosis Chain",
  137: "Polygon",
  42161: "Arbitrum One",
};

/**
 * A deployed smart contract reference
 */
export interface ContractRef {
  address: `0x${string}`;
  chainId: ChainId;
  deployedBlock?: number;
  name: string;
}

/**
 * Protocol descriptor
 */
export interface Protocol {
  id: ProtocolId;
  name: string;
  description: string;
  website: string;
  contracts: ContractRef[];
  assetClass: AssetClass;
  tokenStandard: TokenStandard;
}

export type AssetClass = "real-estate" | "treasury-bond" | "money-market" | "commodity";

export type TokenStandard = "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-20+ERC-721";
