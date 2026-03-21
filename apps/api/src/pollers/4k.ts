/**
 * FourKPoller — indexes 4K Protocol luxury goods NFTs (ERC-1155) on Ethereum mainnet.
 *
 * Strategy:
 *   1. Scan TransferSingle and TransferBatch events on the 4K contract.
 *   2. Collect every unique token ID that moved, along with the recipient (to).
 *      For supply-1 tokens (luxury goods), the latest recipient is the owner.
 *   3. For each token ID: read uri(), resolve {id} placeholder, fetch metadata.
 *   4. Normalize into CedarXAsset and upsert into the database.
 *
 * 4K Physically-Backed NFT: 0xEBf19415d94be89A1d692F82af391685dC1Bff79 (ERC-1155, Ethereum)
 * Verified at: https://etherscan.io/address/0xEBf19415d94be89A1d692F82af391685dC1Bff79
 */

import { parseAbiItem, parseAbi } from "viem";
import { BasePoller } from "./base";
import { FOURTK_CONTRACT } from "../config";
import { upsertAsset } from "../db/queries";
import { fetchTokenMetadata, resolveImageUrl } from "../lib/ipfs";
import { normalize4KAsset, type FourKTokenMetadata } from "../normalizers/4k";

const TRANSFER_SINGLE_EVENT = parseAbiItem(
    "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)"
);

const TRANSFER_BATCH_EVENT = parseAbiItem(
    "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)"
);

const ERC1155_READ_ABI = parseAbi([
    "function uri(uint256 id) view returns (string)",
]);

const FETCH_DELAY_MS = 300;

export class FourKPoller extends BasePoller {
    readonly pollerId = "4k";
    // 4K deployed September 2021, ~block 13,200,000
    readonly startBlock = 13_200_000;

    constructor() {
        super("mainnet");
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        if (!FOURTK_CONTRACT) {
            this.log("FOURTK_CONTRACT_ADDRESS not configured — skipping");
            return;
        }

        const [singleLogs, batchLogs] = await Promise.all([
            this.client.getLogs({
                address: FOURTK_CONTRACT,
                event: TRANSFER_SINGLE_EVENT,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
            }),
            this.client.getLogs({
                address: FOURTK_CONTRACT,
                event: TRANSFER_BATCH_EVENT,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
            }),
        ]);

        if (singleLogs.length === 0 && batchLogs.length === 0) return;

        // Map tokenId → latest recipient (owner for supply-1 tokens)
        const tokenOwners = new Map<bigint, string>();

        for (const log of singleLogs) {
            if (log.args.id !== undefined && log.args.to) {
                tokenOwners.set(log.args.id, log.args.to);
            }
        }
        for (const log of batchLogs) {
            if (log.args.ids && log.args.to) {
                for (const id of log.args.ids) {
                    tokenOwners.set(id, log.args.to!);
                }
            }
        }

        this.log(`found ${tokenOwners.size} token(s) across ${singleLogs.length + batchLogs.length} transfer event(s)`);

        for (const [tokenId, owner] of tokenOwners) {
            try {
                await this._processToken(tokenId, owner);
                await sleep(FETCH_DELAY_MS);
            } catch (err) {
                this.logError(`failed to process token #${tokenId}`, err);
            }
        }
    }

    private async _processToken(tokenId: bigint, owner: string): Promise<void> {
        const rawUri = await this.client.readContract({
            address: FOURTK_CONTRACT,
            abi: ERC1155_READ_ABI,
            functionName: "uri",
            args: [tokenId],
        });

        if (!rawUri) {
            this.log(`token #${tokenId} has no URI — skipping`);
            return;
        }

        // ERC-1155 URIs may contain {id} — replace with zero-padded hex token ID
        const tokenUri = rawUri.replace(
            "{id}",
            tokenId.toString(16).padStart(64, "0")
        );

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
