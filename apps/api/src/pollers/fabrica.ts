/**
 * FabricaPoller — indexes Fabrica land NFTs (ERC-1155) on Ethereum mainnet.
 *
 * Strategy:
 *   1. Scan TransferSingle and TransferBatch events on the Fabrica Land contract.
 *   2. Collect every unique token ID and its latest recipient (= current owner).
 *      Skip burns (to = zeroAddress).
 *   3. For each token ID: read uri(), resolve any {id} template, fetch IPFS metadata.
 *   4. Normalize into CedarXAsset and upsert into the database.
 *
 * Fabrica Land (FAB): 0x5cbeb7a0df7ed85d82a472fd56d81ed550f3ea95 (ERC-1155, Ethereum mainnet)
 * Metadata: IPFS JSON with name, description, image, and trait attributes
 *           (Parcel ID, County, State, Address, Acreage, etc.)
 */

import { parseAbiItem, parseAbi, zeroAddress } from "viem";
import { BasePoller } from "./base";
import { FABRICA_TOKEN_V2 } from "../config";
import { upsertAsset } from "../db/queries";
import { fetchIPFSJson, resolveImageUrl } from "../lib/ipfs";
import { normalizeFabricaAsset, type FabricaTokenMetadata } from "../normalizers/fabrica";

// ERC-1155 transfer events
const TRANSFER_SINGLE_EVENT = parseAbiItem(
    "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)"
);
const TRANSFER_BATCH_EVENT = parseAbiItem(
    "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)"
);

// ERC-1155 read ABI — uri() returns the metadata URI (may contain {id} template)
const FABRICA_READ_ABI = parseAbi([
    "function uri(uint256 id) view returns (string)",
]);

// Small delay between IPFS fetches to avoid hammering gateways
const IPFS_FETCH_DELAY_MS = 300;

export class FabricaPoller extends BasePoller {
    readonly pollerId = "fabrica";
    // Fabrica Land (FAB) ERC-1155 — verify exact block on Etherscan and adjust cursor
    readonly startBlock = 19_500_000;

    constructor() {
        super("mainnet"); // always Ethereum mainnet
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        // ── Step 1: Collect token IDs and their latest recipient ──────────────
        // Map<tokenId, latestTo> — later events in the block range overwrite earlier ones
        const tokenOwners = new Map<bigint, `0x${string}`>();

        // TransferSingle — one token per event
        const singleLogs = await this.client.getLogs({
            address: FABRICA_TOKEN_V2,
            event: TRANSFER_SINGLE_EVENT,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
        });

        for (const log of singleLogs) {
            const { id, to } = log.args;
            if (id !== undefined && to && to !== zeroAddress) {
                tokenOwners.set(id, to);
            }
        }

        // TransferBatch — multiple token IDs per event
        const batchLogs = await this.client.getLogs({
            address: FABRICA_TOKEN_V2,
            event: TRANSFER_BATCH_EVENT,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
        });

        for (const log of batchLogs) {
            const { ids, to } = log.args;
            if (!ids || !to || to === zeroAddress) continue;
            for (const id of ids) {
                tokenOwners.set(id, to);
            }
        }

        if (tokenOwners.size === 0) {
            this.log(`no transfers in blocks ${fromBlock}–${toBlock}`);
            return;
        }

        this.log(
            `found ${tokenOwners.size} unique token(s) from ` +
            `${singleLogs.length} TransferSingle + ${batchLogs.length} TransferBatch event(s)`
        );

        // ── Step 2: Fetch metadata for each token ─────────────────────────────
        for (const [tokenId, owner] of tokenOwners) {
            try {
                await this._processToken(tokenId, owner);
                await sleep(IPFS_FETCH_DELAY_MS);
            } catch (err) {
                this.logError(`failed to process token #${tokenId}`, err);
            }
        }
    }

    private async _processToken(tokenId: bigint, owner: `0x${string}`): Promise<void> {
        let tokenUri: string;
        try {
            tokenUri = await this.client.readContract({
                address: FABRICA_TOKEN_V2,
                abi: FABRICA_READ_ABI,
                functionName: "uri",
                args: [tokenId],
            });
        } catch {
            this.log(`skipping token #${tokenId} — uri() reverted (burned or invalid)`);
            return;
        }

        if (!tokenUri) {
            this.log(`token #${tokenId} has no URI — skipping`);
            return;
        }

        // ERC-1155 URI template: replace {id} with zero-padded 64-char lowercase hex
        const resolvedUri = tokenUri.replace(
            "{id}",
            tokenId.toString(16).padStart(64, "0")
        );

        const metadata = await fetchIPFSJson<FabricaTokenMetadata>(resolvedUri);

        if (metadata.image) {
            metadata.image = resolveImageUrl(metadata.image) ?? metadata.image;
        }

        const asset = normalizeFabricaAsset(tokenId.toString(), owner, metadata);
        await upsertAsset(asset);

        this.log(`upserted Fabrica token #${tokenId} — "${asset.name}"`);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
