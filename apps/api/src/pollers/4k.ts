/**
 * FourKPoller — indexes 4K Protocol luxury goods NFTs (ERC-721) on Ethereum mainnet.
 *
 * Strategy:
 *   1. Scan Transfer events on the 4K contract for [fromBlock, toBlock].
 *   2. Collect every unique token ID that moved.
 *   3. For each token: read tokenURI, fetch metadata (HTTP or IPFS), read owner.
 *   4. Normalize into CedarXAsset and upsert into the database.
 *
 * 4K Genesis Keys: 0x30015b88e33773bce3b8a32A93a13bA23CF91db3 (ERC-721, Ethereum)
 * Verify at: https://etherscan.io/token/0x30015b88e33773bce3b8a32A93a13bA23CF91db3
 */

import { parseAbiItem, parseAbi } from "viem";
import { BasePoller } from "./base";
import { FOURTK_CONTRACT } from "../config";
import { upsertAsset } from "../db/queries";
import { fetchTokenMetadata, resolveImageUrl } from "../lib/ipfs";
import { normalize4KAsset, type FourKTokenMetadata } from "../normalizers/4k";

const TRANSFER_EVENT = parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

const ERC721_READ_ABI = parseAbi([
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
]);

const FETCH_DELAY_MS = 300;

export class FourKPoller extends BasePoller {
    readonly pollerId = "4k";
    readonly startBlock = 16_800_000;

    constructor() {
        super("mainnet");
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        if (!FOURTK_CONTRACT) {
            this.log("FOURTK_CONTRACT_ADDRESS not configured — skipping");
            return;
        }

        const logs = await this.client.getLogs({
            address: FOURTK_CONTRACT,
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
                address: FOURTK_CONTRACT,
                abi: ERC721_READ_ABI,
                functionName: "tokenURI",
                args: [tokenId],
            }),
            this.client.readContract({
                address: FOURTK_CONTRACT,
                abi: ERC721_READ_ABI,
                functionName: "ownerOf",
                args: [tokenId],
            }),
        ]);

        if (!tokenUri) {
            this.log(`token #${tokenId} has no URI — skipping`);
            return;
        }

        const metadata = await fetchTokenMetadata<FourKTokenMetadata>(tokenUri);

        if (metadata.image) {
            metadata.image = resolveImageUrl(metadata.image) ?? metadata.image;
        }

        const asset = normalize4KAsset(tokenId.toString(), owner, metadata);
        await upsertAsset(asset);

        this.log(`upserted 4K token #${tokenId} — "${asset.name}"`);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
