import type { ChainId, ProtocolId } from "./protocols";

/**
 * A whitelisted contract entry — only assets from these contracts
 * will appear on CedarX. This is the quality gate: no random NFTs.
 */
export interface WhitelistedContract {
  address: `0x${string}`;
  chainId: ChainId;
  protocolId: ProtocolId;
  /** Human-readable label, e.g. "Fabrica Token V2" */
  label: string;
  /** Block at which the contract was deployed (used for indexer start block) */
  deployedBlock: number;
}

/**
 * The master whitelist of approved protocol contracts.
 *
 * To add a new protocol or contract:
 *  1. Add its entry here.
 *  2. Implement a concrete BasePoller subclass in apps/api/src/pollers/.
 *  3. Register the poller in apps/api/src/index.ts.
 *
 * Contracts NOT in this list will never appear on cedarx.io regardless
 * of whether they implement a known token standard.
 */
export const PROTOCOL_WHITELIST: WhitelistedContract[] = [
  // ─── Fabrica ──────────────────────────────────────────────────────────────
  // ERC-721 land/property NFTs on Ethereum mainnet
  {
    address: "0x8d96b4ab6c741a4c8679ae323a100d74f085ba8f",
    chainId: 1,
    protocolId: "fabrica",
    label: "Fabrica Token V2",
    deployedBlock: 16_000_000,
  },

  // ─── 4K Protocol ──────────────────────────────────────────────────────────
  // ERC-1155 luxury goods NFTs on Ethereum mainnet.
  // Each token represents a physical item (watch, bag, jewellery) held in
  // secure custody by a 4K Guardian. Burning the token redeems the item.
  // Verified: https://etherscan.io/address/0xEBf19415d94be89A1d692F82af391685dC1Bff79
  {
    address: "0xEBf19415d94be89A1d692F82af391685dC1Bff79" as `0x${string}`,
    chainId: 1,
    protocolId: "4k",
    label: "4K Physically-Backed NFT",
    deployedBlock: 13_200_000,
  },

  // ─── Courtyard ────────────────────────────────────────────────────────────
  // ERC-721 collectibles NFTs on Polygon.
  // Physical items (trading cards, Pokémon cards, sports memorabilia) stored
  // in Courtyard's vault. Token holders can redeem the physical item.
  // Verified: https://polygonscan.com/token/0x251be3a17af4892035c37ebf5890f4a4d889dcad
  {
    address: "0x251be3a17af4892035c37ebf5890f4a4d889dcad" as `0x${string}`,
    chainId: 137,
    protocolId: "courtyard",
    label: "Courtyard NFT (Polygon)",
    deployedBlock: 35_000_000,
  },
];

// ─── Helper utilities ────────────────────────────────────────────────────────

/**
 * Set of lowercase `${chainId}:${address}` strings for O(1) lookup.
 */
const _whitelistSet: Set<string> = new Set(
  PROTOCOL_WHITELIST.map((c) => `${c.chainId}:${c.address.toLowerCase()}`)
);

/**
 * Returns true only if the given contract address on the given chain is in the
 * approved whitelist. Use this in the indexer and API to gate asset ingestion.
 */
export function isWhitelisted(
  address: string,
  chainId: number
): boolean {
  return _whitelistSet.has(`${chainId}:${address.toLowerCase()}`);
}

/**
 * Return every whitelisted contract for a given protocol.
 */
export function getWhitelistedContracts(
  protocolId: ProtocolId
): WhitelistedContract[] {
  return PROTOCOL_WHITELIST.filter((c) => c.protocolId === protocolId);
}

/**
 * Return every whitelisted contract address (lowercased) for a given chain.
 */
export function getWhitelistedAddressesForChain(chainId: number): string[] {
  return PROTOCOL_WHITELIST.filter((c) => c.chainId === chainId).map((c) =>
    c.address.toLowerCase()
  );
}
