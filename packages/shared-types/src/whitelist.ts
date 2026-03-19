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
 *  2. Implement a ProtocolAdapter for it in packages/protocol-adapters.
 *  3. Register the adapter in packages/protocol-adapters/src/registry.ts.
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

  // ─── Ondo Finance ─────────────────────────────────────────────────────────
  // Tokenized US Government bonds (ERC-20, KYC-gated)
  {
    address: "0x1b19c19393e2d034d8ff31ff34c81252fcbbee92",
    chainId: 1,
    protocolId: "ondo",
    label: "OUSG — Ondo US Government Bond",
    deployedBlock: 16_520_000,
  },
  // Ondo US Dollar Yield (permissionless stablecoin yield, ERC-20)
  {
    address: "0x96f6ef951840721adbf46ac996b59e0235cb985c",
    chainId: 1,
    protocolId: "ondo",
    label: "USDY — Ondo US Dollar Yield",
    deployedBlock: 17_400_000,
  },
  // Ondo Short-Term US Government Bond (OUSG v2 / rOUSG)
  {
    address: "0x6e9a65d98474f1c68406e2fe02695fe5a3e7cb0d",
    chainId: 1,
    protocolId: "ondo",
    label: "rOUSG — Rebasing Ondo US Government Bond",
    deployedBlock: 18_000_000,
  },

  // ─── RealT ────────────────────────────────────────────────────────────────
  // RealT issues one ERC-20 token per property. The tokens are deployed by
  // their factory and listed via the official RealT API. Rather than hard-
  // coding every token here (hundreds of addresses), the RealT adapter fetches
  // the authoritative list from api.realt.community and validates each address
  // against that response at runtime. The placeholder entry below acts as the
  // protocol-level sentinel: if "realt" is listed here the indexer will invoke
  // the RealT adapter. The adapter itself is responsible for its sub-registry.
  //
  // Legacy "RealToken" mediator used to facilitate Gnosis-chain distributions:
  {
    address: "0xf9c3bcbab3b6e4f21b31e9b6e66bdbc6baad3cdb",
    chainId: 1,
    protocolId: "realt",
    label: "RealT Token Mediator (Ethereum)",
    deployedBlock: 11_000_000,
  },
  {
    address: "0xf9c3bcbab3b6e4f21b31e9b6e66bdbc6baad3cdb",
    chainId: 100,
    protocolId: "realt",
    label: "RealT Token Mediator (Gnosis Chain)",
    deployedBlock: 14_000_000,
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
