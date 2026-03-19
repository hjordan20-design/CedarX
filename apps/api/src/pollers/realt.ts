/**
 * RealTPoller — indexes RealT tokenized rental properties (ERC-20) on Ethereum.
 *
 * Session 3: scaffold only.
 * Session 4: full implementation — fetch the authoritative property list from
 *            the RealT API (api.realt.community), filter to Ethereum L1 tokens,
 *            normalize each property into the unified schema.
 *
 * Note: RealT has hundreds of tokens (one per property). The poller fetches the
 * full list from the RealT API rather than discovering via onchain events, because
 * the API returns rich property metadata (address, rent, yield, etc.) that would
 * otherwise require many individual IPFS/metadata fetches.
 */

import { BasePoller } from "./base";

const REALT_API_URL = "https://api.realt.community/v1/token";

export class RealTPoller extends BasePoller {
    readonly pollerId = "realt";
    // RealT's earliest Ethereum L1 token deployment
    readonly startBlock = 11_000_000;

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        // TODO (Session 4):
        // 1. GET REALT_API_URL — returns array of all RealT tokens
        // 2. Filter to Ethereum mainnet tokens (fullName, chain, etc.)
        // 3. Cross-reference with whitelist via isWhitelisted()
        // 4. For each token: normalize to CedarXAsset and call upsertAsset()
        this.log(
            `[stub] would fetch RealT API and upsert property tokens ` +
            `(blocks ${fromBlock}–${toBlock})`
        );
    }
}
