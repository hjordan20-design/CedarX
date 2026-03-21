/**
 * CourtyardPoller — indexes Courtyard collectible NFTs (ERC-721) on Polygon.
 *
 * Strategy:
 *   1. Scan Transfer events on the Courtyard contract for [fromBlock, toBlock].
 *   2. Collect every unique token ID that moved.
 *   3. For each token: read tokenURI, fetch metadata, read owner.
 *   4. Normalize into CedarXAsset and upsert into the database.
 *
 * Courtyard NFT: 0x251be3a17af4892035c37ebf5890f4a4d889dcad (ERC-721, Polygon)
 * Verified at: https://polygonscan.com/token/0x251be3a17af4892035c37ebf5890f4a4d889dcad
 */

import { parseAbiItem, parseAbi } from "viem";
import { BasePoller } from "./base";
import { COURTYARD_CONTRACT } from "../config";
import { upsertAsset } from "../db/queries";
import { fetchTokenMetadata, resolveImageUrl } from "../lib/ipfs";
import { normalizeCourtyardAsset, type CourtyardTokenMetadata } from "../normalizers/courtyard";

const TRANSFER_EVENT = parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

const ERC721_READ_ABI = parseAbi([
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
]);

const FETCH_DELAY_MS = 300;

export class CourtyardPoller extends BasePoller {
    readonly pollerId = "courtyard";
    // Courtyard launched on Polygon around block 35M (approx. mid-2022)
    readonly startBlock = 35_000_000;

    constructor() {
        super("polygon"); // Polygon PoS
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        if (!COURTYARD_CONTRACT) {
            this.log("COURTYARD_CONTRACT_ADDRESS not configured — skipping");
            return;
        }

        const logs = await this.client.getLogs({
            address: COURTYARD_CONTRACT,
            event: TRANSFER_EVENT,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
        });

        if (logs.length === 0) return;

        const tokenIds = new Set<bigint>();
        for (const log of logs) {
            if (log.args.tokenId !== undefined) tokenIds.add(log.args.tokenId);
        }

        this.log(`found ${tokenIds.size} token(s) in ${logs.length} Transfer event(s)`);

        for (const tokenId of tokenIds) {
            try {
                await this._processToken(tokenId);
                await sleep(FETCH_DELAY_MS);
            } catch (err) {
                this.logError(`failed to process token #${tokenId}`, err);
            }
        }
    }

    private async _processToken(tokenId: bigint): Promise<void> {
        const [tokenUri, owner] = await Promise.all([
            this.client.readContract({
                address: COURTYARD_CONTRACT,
                abi: ERC721_READ_ABI,
                functionName: "tokenURI",
                args: [tokenId],
            }),
            this.client.readContract({
                address: COURTYARD_CONTRACT,
                abi: ERC721_READ_ABI,
                functionName: "ownerOf",
                args: [tokenId],
            }),
        ]);

        if (!tokenUri) {
            this.log(`token #${tokenId} has no URI — skipping`);
            return;
        }

        const metadata = await fetchTokenMetadata<CourtyardTokenMetadata>(tokenUri);

        if (metadata.image) {
            metadata.image = resolveImageUrl(metadata.image) ?? metadata.image;
        }

        const asset = normalizeCourtyardAsset(tokenId.toString(), owner, metadata);
        await upsertAsset(asset);

        this.log(`upserted Courtyard token #${tokenId} — "${asset.name}"`);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
