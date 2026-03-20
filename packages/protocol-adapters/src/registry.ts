import {
  PROTOCOL_WHITELIST,
  isWhitelisted,
  getWhitelistedContracts,
} from "@cedarx/shared-types";
import type { ProtocolId, WhitelistedContract } from "@cedarx/shared-types";
import type { ProtocolAdapter } from "./types";

/**
 * ProtocolRegistry
 *
 * Single source of truth for which adapters are active and which contracts
 * are eligible for indexing. This is the runtime enforcement of the quality
 * gate: any asset whose contract address is not in PROTOCOL_WHITELIST will
 * be silently discarded before it reaches the API or frontend.
 *
 * Usage:
 *   const registry = new ProtocolRegistry();
 *   registry.register("fabrica", fabricaAdapterInstance);
 *   const assets = await registry.fetchAllAssets(); // only whitelisted assets
 */
export class ProtocolRegistry {
  private adapters = new Map<ProtocolId, ProtocolAdapter>();

  /**
   * Register an adapter. Only protocols listed in PROTOCOL_WHITELIST
   * can be registered — attempting to register an unknown protocol throws.
   */
  register(protocolId: ProtocolId, adapter: ProtocolAdapter): void {
    const hasContracts = PROTOCOL_WHITELIST.some(
      (c) => c.protocolId === protocolId
    );
    if (!hasContracts) {
      throw new Error(
        `Protocol "${protocolId}" has no whitelisted contracts. ` +
          `Add it to PROTOCOL_WHITELIST in packages/shared-types/src/whitelist.ts first.`
      );
    }
    this.adapters.set(protocolId, adapter);
  }

  /** Returns the registered adapter for a given protocol, or undefined. */
  getAdapter(protocolId: ProtocolId): ProtocolAdapter | undefined {
    return this.adapters.get(protocolId);
  }

  /** Returns all registered protocol IDs. */
  getRegisteredProtocols(): ProtocolId[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Fetch all assets from every registered adapter, then filter out anything
   * whose contract is not in the whitelist.
   *
   * This double-checks adapter output against the whitelist so that even if an
   * adapter returns a rogue address, it won't reach the application layer.
   */
  async fetchAllAssets() {
    const results = await Promise.allSettled(
      Array.from(this.adapters.values()).map((adapter) =>
        adapter.fetchAssets()
      )
    );

    const assets = results.flatMap((result) => {
      if (result.status === "fulfilled") return result.value;
      // Log but don't crash; a single adapter failure shouldn't take down the rest
      console.error("[ProtocolRegistry] adapter fetch failed:", result.reason);
      return [];
    });

    // Quality gate — filter out anything not in the whitelist
    return assets.filter((asset) =>
      isWhitelisted(asset.tokenAddress, asset.chainId)
    );
  }

  /**
   * Fetch a single asset by protocol, address, and optional token ID.
   * Returns null if the address is not whitelisted.
   */
  async fetchAsset(
    protocolId: ProtocolId,
    tokenAddress: string,
    tokenId?: string
  ) {
    // Gate: reject immediately if not whitelisted
    const adapter = this.adapters.get(protocolId);
    if (!adapter) return null;

    // For RealT we accept any address from the live API list (validated at adapter level)
    // For other protocols we enforce the static whitelist
    if (protocolId !== "realt" && !isWhitelisted(tokenAddress, 1) && !isWhitelisted(tokenAddress, 100)) {
      return null;
    }

    return adapter.fetchAsset(tokenAddress, tokenId);
  }

  /**
   * Returns the whitelisted contracts for a given protocol.
   * Useful for the indexer to know which start blocks to use.
   */
  getWhitelistedContracts(protocolId: ProtocolId): WhitelistedContract[] {
    return getWhitelistedContracts(protocolId);
  }
}

/** Singleton registry instance for use across the application */
export const protocolRegistry = new ProtocolRegistry();

// Re-export whitelist utilities for convenience
export { isWhitelisted, PROTOCOL_WHITELIST };
