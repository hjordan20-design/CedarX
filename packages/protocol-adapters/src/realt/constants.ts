import type { ContractRef } from "@cedarx/shared-types";

/**
 * RealT issues one ERC-20 token per property. Each token has a fixed supply
 * equal to the number of "RealTokens" for that property (e.g. 10 tokens
 * representing 10% each). Rental income is distributed in USDC/xDAI to token
 * holders on Gnosis Chain via the mediator bridge.
 *
 * Because RealT deploys hundreds of property tokens there is no single factory
 * address to index. Instead, the authoritative token list is maintained by
 * RealT's off-chain API. The adapter fetches that list and uses it as the
 * effective whitelist for RealT assets.
 *
 * See docs/research/realt.md for full protocol details.
 */

/**
 * RealT community API — returns the full list of property tokens with
 * metadata. No API key required for public endpoints.
 */
export const REALT_API_BASE_URL = "https://api.realt.community";

/**
 * Endpoint that returns all active RealT property tokens.
 * GET /v1/token → Array<RealTPropertyToken>
 */
export const REALT_TOKEN_LIST_URL = `${REALT_API_BASE_URL}/v1/token`;

/**
 * Mediator contracts used to bridge RealT ERC-20 tokens between Ethereum
 * mainnet and Gnosis Chain (where USDC/xDAI rent distributions happen).
 * These are infrastructure contracts, not property tokens — they are included
 * in the whitelist as protocol sentinels so the indexer activates the adapter.
 */
export const REALT_MEDIATOR_CONTRACTS = {
  /** Ethereum-side mediator for the AMB bridge */
  ETH_MEDIATOR: {
    address: "0xf9c3bcbab3b6e4f21b31e9b6e66bdbc6baad3cdb" as `0x${string}`,
    chainId: 1,
    deployedBlock: 11_000_000,
    name: "RealT Token Mediator (Ethereum)",
  },
  /** Gnosis-chain-side mediator for the AMB bridge */
  GNOSIS_MEDIATOR: {
    address: "0xf9c3bcbab3b6e4f21b31e9b6e66bdbc6baad3cdb" as `0x${string}`,
    chainId: 100,
    deployedBlock: 14_000_000,
    name: "RealT Token Mediator (Gnosis Chain)",
  },
} as const satisfies Record<string, ContractRef>;

export const REALT_CONTRACT_LIST: ContractRef[] = Object.values(
  REALT_MEDIATOR_CONTRACTS
);

/** The Graph subgraph for RealT on Gnosis Chain */
export const REALT_SUBGRAPH_URL =
  "https://api.thegraph.com/subgraphs/name/real-token-com/realtoken-xdai";
