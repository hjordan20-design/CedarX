/**
 * RealTPoller — indexes RealT tokenized rental properties on Ethereum mainnet.
 *
 * RealT issues one ERC-20 token per property (hundreds of tokens). Instead of
 * discovering them via onchain events, we fetch the authoritative property list
 * from RealT's public API which includes rich metadata (address, yield, images).
 *
 * Strategy:
 *   1. On each tick, GET the RealT token list from their API.
 *   2. Filter to Ethereum mainnet tokens only (v1 scope — no Gnosis Chain).
 *   3. For each token: normalize into CedarXAsset and upsert.
 *
 * The block range parameter is still persisted for cursor consistency but is
 * not used for event scanning — RealT data comes from the API, not event logs.
 *
 * RealT API: https://api.realt.community/v1/token
 *   - Returns the full property list (no pagination needed)
 *   - May require a Bearer token for production access; we try without first
 *   - Rate limit: fetch once per POLL_INTERVAL_MS (default 3 min) — fine for their API
 */

import { BasePoller } from "./base";
import { upsertAsset } from "../db/queries";
import { normalizeRealTAsset, type RealTApiToken } from "../normalizers/realt";

const REALT_API_URL = "https://api.realt.community/v1/token";
const FETCH_TIMEOUT_MS = 30_000; // full list can be large

// RealT property tokens are ERC-20s deployed on Ethereum mainnet (chain id 1)
// Their API uses various fields to indicate the chain — filter on these.
const ETH_CHAIN_INDICATORS = new Set([
    "ethereum",
    "eth",
    "xdai_ethereum",   // bridged but originated on Ethereum
]);

export class RealTPoller extends BasePoller {
    readonly pollerId = "realt";
    readonly startBlock = 11_000_000; // earliest known RealT Ethereum deployment

    constructor() {
        super("mainnet");
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        this.log("fetching RealT token list from API");

        const tokens = await this._fetchTokenList();
        if (tokens.length === 0) {
            this.log("API returned empty token list — skipping");
            return;
        }

        // Filter to Ethereum mainnet only
        const ethTokens = tokens.filter((t) => this._isEthereumToken(t));
        this.log(`${ethTokens.length} Ethereum L1 tokens (of ${tokens.length} total)`);

        let upserted = 0;
        let skipped = 0;

        for (const token of ethTokens) {
            try {
                if (!token.contractAddress || token.contractAddress === "0x") {
                    skipped++;
                    continue;
                }
                const asset = normalizeRealTAsset(token);
                await upsertAsset(asset);
                upserted++;
            } catch (err) {
                this.logError(`failed to upsert ${token.shortName}`, err);
                skipped++;
            }
        }

        this.log(`upserted ${upserted} properties, skipped ${skipped}`);
    }

    private async _fetchTokenList(): Promise<RealTApiToken[]> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const res = await fetch(REALT_API_URL, {
                signal: controller.signal,
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401 || res.status === 403) {
                this.log("RealT API returned 401/403 — API key may be required. Skipping.");
                return [];
            }

            if (!res.ok) {
                throw new Error(`RealT API responded with HTTP ${res.status}`);
            }

            const data = await res.json();

            // API may wrap the array: { tokens: [...] } or return it directly
            if (Array.isArray(data)) return data as RealTApiToken[];
            if (Array.isArray(data?.tokens)) return data.tokens as RealTApiToken[];
            if (Array.isArray(data?.data)) return data.data as RealTApiToken[];

            this.log(`unexpected RealT API shape: ${JSON.stringify(Object.keys(data ?? {}))}`);
            return [];
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Determine if a RealT token is on Ethereum L1.
     * RealT's API doesn't have a single clean "chain" field, so we check several.
     */
    private _isEthereumToken(token: RealTApiToken): boolean {
        // Some tokens have an explicit chain field
        const chain = (token as any).chain ?? (token as any).network ?? "";
        if (chain && !ETH_CHAIN_INDICATORS.has(chain.toLowerCase())) {
            return false;
        }

        // Tokens without a valid Ethereum address are skipped
        const addr = token.contractAddress?.toLowerCase() ?? "";
        return addr.startsWith("0x") && addr.length === 42;
    }
}
