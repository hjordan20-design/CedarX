/**
 * FabricaPoller — indexes Fabrica land NFTs (ERC-721) on Ethereum mainnet.
 *
 * Strategy:
 *   1. Scan Transfer events on the Fabrica Token V2 contract for [fromBlock, toBlock].
 *   2. Collect every unique token ID that moved (mints, transfers — we want current state).
 *   3. For each token ID: read tokenURI, fetch IPFS metadata, read current owner.
 *   4. Normalize into CedarXAsset and upsert into the database.
 *
 * Fabrica Token V2 (FAB): 0x1464e8659b9ab3811e0dcd601c401799f1e63f11 (ERC-721, Ethereum mainnet)
 * Metadata: IPFS JSON with name, description, image, and trait attributes
 *           (Parcel ID, County, State, Address, Acreage, etc.)
 */

import { parseAbiItem, parseAbi, zeroAddress } from "viem";
import { BasePoller } from "./base";
import { FABRICA_TOKEN_V2 } from "../config";
import { upsertAsset } from "../db/queries";
import { fetchIPFSJson, resolveImageUrl } from "../lib/ipfs";
import { normalizeFabricaAsset, type FabricaTokenMetadata } from "../normalizers/fabrica";

// Minimal ABIs — only what we need
const TRANSFER_EVENT = parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

const FABRICA_READ_ABI = parseAbi([
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
]);

// Small delay between IPFS fetches to avoid hammering gateways
const IPFS_FETCH_DELAY_MS = 300;

export class FabricaPoller extends BasePoller {
    readonly pollerId = "fabrica";
    readonly startBlock = 19_000_000; // Fabrica Token V2 (FAB) deployment block

    constructor() {
        super("mainnet"); // always read from Ethereum mainnet
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        // ── Step 1: Collect all Transfer events in range ─────────────────────
        const logs = await this.client.getLogs({
            address: FABRICA_TOKEN_V2,
            event: TRANSFER_EVENT,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
        });

        if (logs.length === 0) {
            this.log(`no transfers in blocks ${fromBlock}–${toBlock}`);
            return;
        }

        // Deduplicate token IDs — only process each token once per tick
        // (a token that transferred twice in the range still has one current state)
        const tokenIds = new Set<bigint>();
        for (const log of logs) {
            if (log.args.tokenId !== undefined) {
                tokenIds.add(log.args.tokenId);
            }
        }

        this.log(`found ${tokenIds.size} unique token(s) in ${logs.length} Transfer event(s)`);

        // ── Step 2: Fetch metadata + owner for each token ────────────────────
        for (const tokenId of tokenIds) {
            try {
                await this._processToken(tokenId);
                // Throttle IPFS fetches
                await sleep(IPFS_FETCH_DELAY_MS);
            } catch (err) {
                this.logError(`failed to process token #${tokenId}`, err);
            }
        }
    }

    private async _processToken(tokenId: bigint): Promise<void> {
        // Read tokenURI and current owner in parallel
        const [tokenUri, owner] = await Promise.all([
            this.client.readContract({
                address: FABRICA_TOKEN_V2,
                abi: FABRICA_READ_ABI,
                functionName: "tokenURI",
                args: [tokenId],
            }),
            this.client.readContract({
                address: FABRICA_TOKEN_V2,
                abi: FABRICA_READ_ABI,
                functionName: "ownerOf",
                args: [tokenId],
            }),
        ]);

        if (!tokenUri) {
            this.log(`token #${tokenId} has no URI — skipping`);
            return;
        }

        // Fetch IPFS metadata
        const metadata = await fetchIPFSJson<FabricaTokenMetadata>(tokenUri);

        // Resolve IPFS image URL to HTTP
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
