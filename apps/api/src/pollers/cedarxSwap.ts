/**
 * CedarXSwapPoller — keeps the `listings` and `trades` tables in sync with
 * the CedarXSwap contract by scanning four event types on every tick.
 *
 * Events and their DB effects:
 *
 *   Listed(listingId, seller, tokenContract, tokenId, quantity, askingPrice, standard)
 *     → INSERT listing row (status = 'active')
 *     → SET asset.current_listing_price = askingPrice
 *
 *   Cancelled(listingId, seller)
 *     → UPDATE listing.status = 'cancelled'
 *     → SET asset.current_listing_price = cheapest remaining active listing (or null)
 *
 *   PriceUpdated(listingId, oldPrice, newPrice)
 *     → UPDATE listing.asking_price = newPrice
 *     → SET asset.current_listing_price = newPrice
 *
 *   Sold(listingId, buyer, seller, tokenContract, tokenId, quantity, salePrice, fee)
 *     → UPDATE listing.status = 'sold'
 *     → INSERT trade row
 *     → SET asset.last_sale_price = salePrice, current_listing_price = null
 *     → ADD salePrice to asset.total_volume
 *
 * All events are fetched in a single getLogs call per tick and processed in
 * strict (blockNumber, logIndex) order so state transitions are always correct
 * even when multiple events for the same listing appear in the same block.
 *
 * Chain follows CHAIN_ENV — Sepolia for testing, mainnet for production.
 */

import { parseAbiItem } from "viem";
import { BasePoller } from "./base";
import { CEDARX_SWAP_ADDRESS } from "../config";
import {
    getAssetIdByToken,
    getAsset,
    getListingById,
    upsertListing,
    setListingStatus,
    updateListingAskingPrice,
    getCheapestActiveListingPrice,
    insertTrade,
    updateAssetMarketData,
} from "../db/queries";
import type { ListingInsert, TradeInsert } from "../db/types";

// ─── Event ABIs ───────────────────────────────────────────────────────────────

const LISTED_EVENT = parseAbiItem(
    "event Listed(uint256 indexed listingId, address indexed seller, address indexed tokenContract, uint256 tokenId, uint256 quantity, uint256 askingPrice, uint8 standard)"
);
const CANCELLED_EVENT = parseAbiItem(
    "event Cancelled(uint256 indexed listingId, address indexed seller)"
);
const PRICE_UPDATED_EVENT = parseAbiItem(
    "event PriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice)"
);
const SOLD_EVENT = parseAbiItem(
    "event Sold(uint256 indexed listingId, address indexed buyer, address indexed seller, address tokenContract, uint256 tokenId, uint256 quantity, uint256 salePrice, uint256 fee)"
);

// The full ABI array — kept here for reference and for export to frontend/tests
export const CEDARX_SWAP_ABI = [
    LISTED_EVENT,
    CANCELLED_EVENT,
    PRICE_UPDATED_EVENT,
    SOLD_EVENT,
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Contract TokenStandard enum → DB string */
const TOKEN_STANDARD_MAP: Record<number, "ERC-721" | "ERC-1155" | "ERC-20"> = {
    0: "ERC-721",
    1: "ERC-1155",
    2: "ERC-20",
};

/** Convert raw USDC bigint (6 decimals) to human-readable decimal string */
function usdc(raw: bigint): string {
    return (Number(raw) / 1e6).toFixed(6);
}

/** Convert raw USDC bigint to number for market data fields */
function usdcNum(raw: bigint): number {
    return Number(raw) / 1e6;
}

// ─── Poller ───────────────────────────────────────────────────────────────────

export class CedarXSwapPoller extends BasePoller {
    readonly pollerId = "cedarx-swap";
    readonly startBlock = 0; // Updated after each deployment

    // Block timestamp cache — populated on-demand, cleared each tick
    private _blockTimestamps = new Map<number, string>();

    // No chain override — follows CHAIN_ENV (Sepolia for testing, mainnet for prod)
    constructor() {
        super();
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        if (!CEDARX_SWAP_ADDRESS) {
            this.log("CEDARX_SWAP_CONTRACT_ADDRESS not set — skipping");
            return;
        }

        // Clear block timestamp cache for this tick
        this._blockTimestamps.clear();

        // ── Fetch all four event types in a single RPC call ───────────────────
        const logs = await this.client.getLogs({
            address: CEDARX_SWAP_ADDRESS,
            events: [LISTED_EVENT, CANCELLED_EVENT, PRICE_UPDATED_EVENT, SOLD_EVENT],
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
            strict: true,
        });

        if (logs.length === 0) return;

        // Sort by (blockNumber, logIndex) — critical for correct state transitions
        const sorted = [...logs].sort((a, b) => {
            const blockDiff = Number(a.blockNumber ?? 0n) - Number(b.blockNumber ?? 0n);
            return blockDiff !== 0 ? blockDiff : (a.logIndex ?? 0) - (b.logIndex ?? 0);
        });

        this.log(`processing ${sorted.length} event(s) in blocks ${fromBlock}–${toBlock}`);

        for (const log of sorted) {
            try {
                await this._handleLog(log);
            } catch (err) {
                this.logError(`failed to handle ${log.eventName} (tx ${log.transactionHash})`, err);
            }
        }
    }

    private async _handleLog(log: any): Promise<void> {
        switch (log.eventName) {
            case "Listed":       return this._onListed(log);
            case "Cancelled":    return this._onCancelled(log);
            case "PriceUpdated": return this._onPriceUpdated(log);
            case "Sold":         return this._onSold(log);
        }
    }

    // ── Listed ────────────────────────────────────────────────────────────────

    private async _onListed(log: any): Promise<void> {
        const { listingId, seller, tokenContract, tokenId, quantity, askingPrice, standard } = log.args;

        const standardStr = TOKEN_STANDARD_MAP[standard] ?? "ERC-20";
        const isNFT = standard === 0 || standard === 1;   // ERC-721 or ERC-1155
        const tokenIdStr = isNFT ? tokenId.toString() : null;

        // Resolve internal asset_id (may be null if protocol poller hasn't indexed it yet)
        const assetId = await getAssetIdByToken(tokenContract, tokenIdStr, isNFT);

        const listing: ListingInsert = {
            listing_id:     Number(listingId),
            asset_id:       assetId,
            seller:         seller.toLowerCase(),
            token_contract: tokenContract.toLowerCase(),
            token_id:       tokenIdStr,
            quantity:       quantity.toString(),
            asking_price:   usdc(askingPrice),
            token_standard: standardStr,
            status:         "active",
            tx_hash:        log.transactionHash,
            block_number:   Number(log.blockNumber),
            log_index:      log.logIndex,
        };

        await upsertListing(listing);

        // Update asset's displayed listing price
        if (assetId) {
            await updateAssetMarketData(assetId, { current_listing_price: usdcNum(askingPrice) });
        }

        this.log(`Listed #${listingId} — ${standardStr} ${tokenContract} @ ${usdc(askingPrice)} USDC`);
    }

    // ── Cancelled ─────────────────────────────────────────────────────────────

    private async _onCancelled(log: any): Promise<void> {
        const { listingId } = log.args;
        const id = Number(listingId);

        // Fetch before status update so we have asset_id
        const existing = await getListingById(id);
        await setListingStatus(id, "cancelled");

        if (existing?.asset_id) {
            // If another active listing exists for this asset, use its price;
            // otherwise clear the listing price
            const cheapest = await getCheapestActiveListingPrice(existing.asset_id);
            await updateAssetMarketData(existing.asset_id, { current_listing_price: cheapest });
        }

        this.log(`Cancelled #${listingId}`);
    }

    // ── PriceUpdated ──────────────────────────────────────────────────────────

    private async _onPriceUpdated(log: any): Promise<void> {
        const { listingId, newPrice } = log.args;
        const id = Number(listingId);
        const newPriceStr = usdc(newPrice);

        await updateListingAskingPrice(id, newPriceStr);

        // Mirror to asset market data
        const existing = await getListingById(id);
        if (existing?.asset_id) {
            await updateAssetMarketData(existing.asset_id, {
                current_listing_price: usdcNum(newPrice),
            });
        }

        this.log(`PriceUpdated #${listingId} → ${newPriceStr} USDC`);
    }

    // ── Sold ──────────────────────────────────────────────────────────────────

    private async _onSold(log: any): Promise<void> {
        const {
            listingId,
            buyer,
            seller,
            tokenContract,
            tokenId,
            quantity,
            salePrice,
            fee,
        } = log.args;

        const id = Number(listingId);
        const existing = await getListingById(id);

        // Resolve asset_id — prefer from existing listing, fall back to lookup
        const isNFT = existing
            ? existing.token_standard !== "ERC-20"
            : false;
        const tokenIdStr = isNFT ? tokenId.toString() : null;
        const assetId =
            existing?.asset_id ??
            (await getAssetIdByToken(tokenContract, tokenIdStr, isNFT));

        // Mark listing sold
        await setListingStatus(id, "sold");

        // Fetch block timestamp for traded_at
        const tradedAt = await this._getBlockTimestamp(Number(log.blockNumber));

        // Insert trade record
        const trade: TradeInsert = {
            id:           `${log.transactionHash}:${log.logIndex}`,
            listing_id:   id,
            asset_id:     assetId,
            buyer:        buyer.toLowerCase(),
            seller:       seller.toLowerCase(),
            sale_price:   usdc(salePrice),
            fee:          usdc(fee),
            tx_hash:      log.transactionHash,
            block_number: Number(log.blockNumber),
            log_index:    log.logIndex,
            traded_at:    tradedAt,
        };

        await insertTrade(trade);

        // Update asset market data — increment volume atomically via fetch+update
        if (assetId) {
            const asset = await getAsset(assetId);
            const prevVolume = asset?.total_volume ?? 0;
            await updateAssetMarketData(assetId, {
                last_sale_price:       usdcNum(salePrice),
                current_listing_price: null,          // listing is gone
                total_volume:          prevVolume + usdcNum(salePrice),
            });
        }

        this.log(
            `Sold #${listingId} — ${usdc(salePrice)} USDC ` +
            `(fee ${usdc(fee)}) buyer ${buyer.slice(0, 10)}…`
        );
    }

    // ── Block timestamp cache ─────────────────────────────────────────────────

    private async _getBlockTimestamp(blockNumber: number): Promise<string> {
        const cached = this._blockTimestamps.get(blockNumber);
        if (cached) return cached;

        const block = await this.client.getBlock({ blockNumber: BigInt(blockNumber) });
        const iso = new Date(Number(block.timestamp) * 1000).toISOString();
        this._blockTimestamps.set(blockNumber, iso);
        return iso;
    }
}
