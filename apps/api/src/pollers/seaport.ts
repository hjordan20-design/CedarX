/**
 * SeaportPoller — periodically queries the OpenSea API for active Seaport
 * listings on every asset in our index, then keeps the seaport_orders table
 * and asset.has_active_listing flag in sync.
 *
 * Unlike the chain pollers this does NOT extend BasePoller because it polls
 * an HTTP API rather than scanning blockchain logs.  The lifecycle is the
 * same: start() / stop(), one tick immediately, then every interval.
 *
 * Batching strategy
 * -----------------
 * OpenSea's free-tier rate limit is ~2 req/s.  We group token IDs by
 * (chain, contract_address) and send up to BATCH_SIZE token IDs per request,
 * sleeping DELAY_MS between requests to avoid 429s.
 */

import {
    OPENSEA_API_KEY,
    OPENSEA_API_BASE_URL,
    SEAPORT_POLL_INTERVAL_MS,
} from "../config";
import {
    getAllIndexedAssets,
    getActiveSeaportOrderHashes,
    upsertSeaportOrder,
    expireSeaportOrders,
    syncAssetSeaportListing,
    getActiveSeaportOrder,
} from "../db/queries";
import type { SeaportOrderInsert } from "../db/types";

// ─── OpenSea API response shapes ─────────────────────────────────────────────

interface OpenSeaOrderParameters {
    offerer: string;
    zone: string;
    offer: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
    }>;
    consideration: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
        recipient: string;
    }>;
    orderType: number;
    startTime: string;
    endTime: string;
    zoneHash: string;
    salt: string;
    conduitKey: string;
    totalOriginalConsiderationItems: number;
}

interface OpenSeaOrder {
    order_hash: string;
    protocol_data: {
        parameters: OpenSeaOrderParameters;
        signature: string;
    };
    current_price: string;            // total price in payment token raw units
    maker: { address: string };
    closing_date: string | null;      // ISO timestamp or null
    payment_token_contract: {
        address: string;
        symbol: string;
        decimals: number;
        usd_price: string | null;
    } | null;
}

interface OpenSeaListingsResponse {
    orders: OpenSeaOrder[];
    next: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 20;   // token IDs per OpenSea API request
const DELAY_MS   = 600;  // ms between requests (~1.7 req/s, safely under 2/s)

// Chain label mapping: our internal chain → OpenSea slug
const CHAIN_TO_OPENSEA: Record<string, string> = {
    ethereum: "ethereum",
    polygon:  "matic",
};

// ─── SeaportPoller ────────────────────────────────────────────────────────────

export class SeaportPoller {
    private timer: ReturnType<typeof setInterval> | null = null;
    private running = false;

    start(): void {
        if (this.running) return;
        this.running = true;
        this.log("starting");
        void this.tick();
        this.timer = setInterval(() => void this.tick(), SEAPORT_POLL_INTERVAL_MS);
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.running = false;
        this.log("stopped");
    }

    // ── Main tick ─────────────────────────────────────────────────────────────

    private async tick(): Promise<void> {
        if (!OPENSEA_API_KEY) {
            this.log("OPENSEA_API_KEY not set — skipping Seaport order sync");
            return;
        }

        try {
            const assets = await getAllIndexedAssets();
            this.log(`syncing Seaport orders for ${assets.length} indexed assets`);

            // Group by (chain, contract_address)
            const groups = new Map<string, typeof assets>();
            for (const asset of assets) {
                const key = `${asset.chain}::${asset.contract_address.toLowerCase()}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(asset);
            }

            for (const [key, group] of groups) {
                const [chain, contractAddress] = key.split("::");
                const openSeaChain = CHAIN_TO_OPENSEA[chain];
                if (!openSeaChain) continue; // unsupported chain

                // Process in batches of BATCH_SIZE
                for (let i = 0; i < group.length; i += BATCH_SIZE) {
                    const batch = group.slice(i, i + BATCH_SIZE);
                    await this.processBatch(openSeaChain, contractAddress, batch);
                    await sleep(DELAY_MS);
                }
            }

            this.log("Seaport order sync complete");
        } catch (err) {
            this.logError("tick failed", err);
        }
    }

    // ── Process one batch of token IDs for a single contract ─────────────────

    private async processBatch(
        openSeaChain: string,
        contractAddress: string,
        assets: Array<{ id: string; token_id: string | null; chain: string }>
    ): Promise<void> {
        const tokenIds = assets
            .filter((a) => a.token_id !== null)
            .map((a) => a.token_id as string);

        // ERC-20 assets have no token_id; skip for Seaport (which is NFT-only)
        if (!tokenIds.length) return;

        let freshOrderHashes: string[] = [];

        try {
            const url = new URL(`${OPENSEA_API_BASE_URL}/api/v2/orders/${openSeaChain}/seaport/listings`);
            url.searchParams.set("asset_contract_address", contractAddress);
            for (const tid of tokenIds) url.searchParams.append("token_ids", tid);
            url.searchParams.set("order_by", "eth_price");
            url.searchParams.set("order_direction", "asc");
            url.searchParams.set("limit", String(Math.min(tokenIds.length * 5, 50)));

            const res = await fetch(url.toString(), {
                headers: {
                    "x-api-key": OPENSEA_API_KEY,
                    accept: "application/json",
                },
            });

            if (res.status === 429) {
                this.log("OpenSea rate limit hit — backing off 5s");
                await sleep(5000);
                return;
            }
            if (!res.ok) {
                this.logError(`OpenSea API error ${res.status}`, await res.text());
                return;
            }

            const body = (await res.json()) as OpenSeaListingsResponse;
            const orders = body.orders ?? [];

            // Map tokenId → asset.id for quick lookup
            const tokenIdToAssetId = new Map<string, string>();
            for (const a of assets) {
                if (a.token_id) tokenIdToAssetId.set(a.token_id, a.id);
            }

            for (const order of orders) {
                const offer = order.protocol_data?.parameters?.offer?.[0];
                if (!offer) continue;

                const tokenId = offer.identifierOrCriteria;
                const assetId = tokenIdToAssetId.get(tokenId) ?? null;
                if (!assetId) continue;

                const paymentToken = order.payment_token_contract;
                const paymentTokenAddress = paymentToken?.address?.toLowerCase() ?? "0x0000000000000000000000000000000000000000";
                const paymentTokenSymbol  = paymentToken?.symbol ?? "ETH";
                const paymentTokenDecimals = paymentToken?.decimals ?? 18;

                const priceUsd = paymentToken?.usd_price
                    ? String(Number(order.current_price) / Math.pow(10, paymentTokenDecimals) * Number(paymentToken.usd_price))
                    : null;

                const insert: SeaportOrderInsert = {
                    order_hash:               order.order_hash,
                    asset_id:                 assetId,
                    chain:                    assets[0].chain,
                    seller_address:           order.maker.address.toLowerCase(),
                    price:                    order.current_price,
                    payment_token:            paymentTokenAddress,
                    payment_token_symbol:     paymentTokenSymbol,
                    payment_token_decimals:   paymentTokenDecimals,
                    price_usd:                priceUsd,
                    expiration:               order.closing_date ?? null,
                    order_parameters:         {
                        parameters: order.protocol_data.parameters,
                        signature:  order.protocol_data.signature,
                    },
                    source: "opensea",
                    status: "active",
                };

                await upsertSeaportOrder(insert);
                freshOrderHashes.push(order.order_hash);
            }

            // Expire any stored active orders that OpenSea no longer returns
            // (means they were filled, cancelled, or expired on-chain)
            for (const asset of assets) {
                if (!asset.token_id) continue;
                const stored = await getActiveSeaportOrderHashes(asset.id);
                const stale  = stored.filter((h) => !freshOrderHashes.includes(h));
                if (stale.length) await expireSeaportOrders(stale);

                // Sync has_active_listing + current_listing_price on asset
                const cheapest = await getActiveSeaportOrder(asset.id);
                await syncAssetSeaportListing(asset.id, cheapest);
            }
        } catch (err) {
            this.logError(`batch failed for ${contractAddress}`, err);
        }
    }

    // ── Logging ───────────────────────────────────────────────────────────────

    private log(msg: string): void {
        console.log(`[seaport] ${msg}`);
    }

    private logError(msg: string, err: unknown): void {
        console.error(`[seaport] ${msg}:`, err instanceof Error ? err.message : err);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}
