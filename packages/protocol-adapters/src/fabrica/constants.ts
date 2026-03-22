import type { ContractRef } from "@cedarx/shared-types";

/**
 * Fabrica tokenizes real property (land/deed) as ERC-721 NFTs on Ethereum.
 * Each token represents 100% ownership of a specific parcel identified by
 * its APN (Assessor's Parcel Number). The token URI points to an IPFS JSON
 * metadata file that includes the property address, APN, and legal document
 * hashes stored on Arweave.
 *
 * See docs/research/fabrica.md for full protocol details.
 */
export const FABRICA_CONTRACTS = {
  /** Main ERC-721 contract for Fabrica property tokens — FAB */
  FABRICA_TOKEN_V2: {
    address: "0x1464e8659b9ab3811e0dcd601c401799f1e63f11" as `0x${string}`,
    chainId: 1,
    deployedBlock: 19_000_000,
    name: "Fabrica Token V2",
  },
} as const satisfies Record<string, ContractRef>;

/** Ordered list of Fabrica contract refs used by the adapter */
export const FABRICA_CONTRACT_LIST: ContractRef[] = Object.values(
  FABRICA_CONTRACTS
);

/** The Graph subgraph for Fabrica on Ethereum mainnet */
export const FABRICA_SUBGRAPH_URL =
  "https://api.thegraph.com/subgraphs/name/fabrica-land/fabrica-ethereum";
