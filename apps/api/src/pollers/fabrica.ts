/**
 * FabricaPoller — indexes Fabrica land NFTs (ERC-721) on Ethereum.
 *
 * Session 3: scaffold only.
 * Session 4: full implementation — scan Transfer events, fetch IPFS metadata,
 *            normalize into the unified schema, persist to `assets`.
 */

import { BasePoller } from "./base";
import { FABRICA_TOKEN_V2 } from "../config";

export class FabricaPoller extends BasePoller {
    readonly pollerId = "fabrica";

    // Fabrica Token V2 deployed at ~block 16,000,000
    readonly startBlock = 16_000_000;

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        // TODO (Session 4): scan Transfer events on FABRICA_TOKEN_V2,
        // fetch IPFS metadata for each minted token, normalize to CedarXAsset,
        // call upsertAsset() for each.
        this.log(`[stub] would scan ${FABRICA_TOKEN_V2} blocks ${fromBlock}–${toBlock}`);
    }
}
