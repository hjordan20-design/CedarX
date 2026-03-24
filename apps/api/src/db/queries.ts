/**
 * Query helpers for the CedarX indexer.
 *
 * All reads go through these functions so SQL logic stays centralised.
 * The Express routes call these; the pollers call the write helpers.
 */

import { getDb } from "./client";
import type { AssetInsert, AssetRow, ListingInsert, TradeInsert, SeaportOrderInsert, SeaportOrderRow } from "./types";

// ─── Types returned by queries ────────────────────────────────────────────────

export interface AssetFilters {
    category?: string;
    protocol?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "price_asc" | "price_desc" | "newest" | "volume";
    search?: string;
    page?: number;
    limit?: number;
    /** When true, only return assets that have an active CedarX listing OR active Seaport order */
    listedOnly?: boolean;
}

export interface ListingFilters {
    category?: string;
    sort?: "price_asc" | "price_desc" | "newest";
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// ─── Assets: reads ────────────────────────────────────────────────────────────

export async function getAssets(filters: AssetFilters = {}): Promise<PaginatedResult<AssetRow>> {
    const db = getDb();
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    let query = db.from("assets").select("*", { count: "exact" });

    if (filters.category) {
        const cat = filters.category.toLowerCase();
        // "real-estate" encompasses Fabrica's "land" category as well
        const values = cat === "real-estate" ? ["real-estate", "land"] : [cat];
        query = query.in("category", values);
    }
    if (filters.protocol) query = query.eq("protocol", filters.protocol);
    if (filters.listedOnly) {
        // has_active_listing is the canonical source of truth: it's set true by
        // syncAssetSeaportListing whenever an active Seaport order exists, and
        // false when the last order expires/fills.  We also require a non-null
        // current_listing_price so every returned asset renders a dollar amount —
        // no "—" cards and no "Listed" placeholders without prices.
        query = query
            .eq("has_active_listing", true)
            .not("current_listing_price", "is", null);
    }
    if (filters.minPrice != null) query = query.gte("current_listing_price", filters.minPrice);
    if (filters.maxPrice != null) query = query.lte("current_listing_price", filters.maxPrice);
    if (filters.search) {
        // Simple name search — upgrade to full-text in a later session
        query = query.ilike("name", `%${filters.search}%`);
    }

    // Sorting
    switch (filters.sort) {
        case "price_asc":
            query = query.order("current_listing_price", { ascending: true, nullsFirst: false });
            break;
        case "price_desc":
            query = query.order("current_listing_price", { ascending: false, nullsFirst: false });
            break;
        case "volume":
            query = query.order("total_volume", { ascending: false });
            break;
        case "newest":
        default:
            query = query.order("created_at", { ascending: false });
            break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;
    return {
        data: data ?? [],
        total,
        page,
        limit,
        hasMore: offset + limit < total,
    };
}

export async function getAsset(id: string): Promise<AssetRow | null> {
    const db = getDb();
    const { data, error } = await db.from("assets").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
    return data ?? null;
}

// ─── Asset history ────────────────────────────────────────────────────────────

export async function getAssetHistory(assetId: string, limit = 50) {
    const db = getDb();
    const { data, error } = await db
        .from("trades")
        .select("*")
        .eq("asset_id", assetId)
        .order("traded_at", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
}

// ─── Listings: reads ──────────────────────────────────────────────────────────

export async function getListings(
    filters: ListingFilters = {}
): Promise<PaginatedResult<any>> {
    const db = getDb();
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    // Join listings with assets so the API can return enriched listing data
    let query = db
        .from("listings")
        .select("*, assets(*)", { count: "exact" })
        .eq("status", "active");

    if (filters.category) {
        const cat = filters.category.toLowerCase();
        const values = cat === "real-estate" ? ["real-estate", "land"] : [cat];
        query = query.in("assets.category", values);
    }

    switch (filters.sort) {
        case "price_asc":
            query = query.order("asking_price", { ascending: true });
            break;
        case "price_desc":
            query = query.order("asking_price", { ascending: false });
            break;
        case "newest":
        default:
            query = query.order("created_at", { ascending: false });
            break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;
    return { data: data ?? [], total, page, limit, hasMore: offset + limit < total };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
    const db = getDb();

    const [assetCount, activeListings, tradeStats, protocolBreakdown] = await Promise.all([
        // Total indexed assets
        db.from("assets").select("id", { count: "exact", head: true }),

        // Active listing count
        db.from("listings").select("listing_id", { count: "exact", head: true }).eq("status", "active"),

        // Total volume and trade count
        db.from("trades").select("sale_price"),

        // Asset count per protocol
        db.from("assets").select("protocol"),
    ]);

    if (assetCount.error) throw assetCount.error;
    if (activeListings.error) throw activeListings.error;
    if (tradeStats.error) throw tradeStats.error;
    if (protocolBreakdown.error) throw protocolBreakdown.error;

    const trades = tradeStats.data ?? [];
    const totalVolume = trades.reduce((sum, t) => sum + Number(t.sale_price), 0);
    const tradeCount = trades.length;

    // Tally per-protocol
    const protocolCounts: Record<string, number> = {};
    for (const row of protocolBreakdown.data ?? []) {
        protocolCounts[row.protocol] = (protocolCounts[row.protocol] ?? 0) + 1;
    }

    return {
        totalAssets: assetCount.count ?? 0,
        activeListings: activeListings.count ?? 0,
        totalVolume: totalVolume.toFixed(2),
        totalTrades: tradeCount,
        byProtocol: protocolCounts,
    };
}

// ─── Protocols ────────────────────────────────────────────────────────────────

export async function getProtocols() {
    const db = getDb();
    const { data, error } = await db.from("assets").select("protocol");
    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
        counts[row.protocol] = (counts[row.protocol] ?? 0) + 1;
    }

    const PROTOCOL_META: Record<string, { name: string; category: string; website: string }> = {
        fabrica: { name: "Fabrica",      category: "land",             website: "https://fabrica.land" },
        ondo:    { name: "Ondo Finance", category: "fixed-income",     website: "https://ondo.finance" },
        realt:   { name: "RealT",        category: "rental-property",  website: "https://realt.co" },
    };

    return Object.entries(PROTOCOL_META).map(([id, meta]) => ({
        id,
        ...meta,
        assetCount: counts[id] ?? 0,
    }));
}

// ─── Assets: writes (used by pollers) ────────────────────────────────────────

export async function upsertAsset(asset: AssetInsert): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("assets")
        .upsert({ ...asset, last_updated: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
}

export async function updateAssetMarketData(
    id: string,
    data: { current_listing_price?: number | null; last_sale_price?: number; total_volume?: number }
): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("assets")
        .update({ ...data, last_updated: new Date().toISOString() })
        .eq("id", id);
    if (error) throw error;
}

// ─── Asset ID lookup (used by cedarxSwap poller) ─────────────────────────────

/**
 * Look up an asset's internal ID from its onchain token contract + token ID.
 *
 * For ERC-721 / ERC-1155: matches on contract_address AND token_id.
 * For ERC-20 (isNFT = false): matches on contract_address only (token_id IS NULL).
 *
 * Returns null if the asset hasn't been indexed yet — the listing will be stored
 * with a null asset_id and back-filled on the next protocol poller tick.
 */
export async function getAssetIdByToken(
    contractAddress: string,
    tokenId: string | null,
    isNFT: boolean
): Promise<string | null> {
    const db = getDb();
    let query = db
        .from("assets")
        .select("id")
        .eq("contract_address", contractAddress.toLowerCase());

    if (isNFT && tokenId != null) {
        query = query.eq("token_id", tokenId);
    } else {
        query = query.is("token_id", null);
    }

    const { data } = await query.maybeSingle();
    return data?.id ?? null;
}

/**
 * Fetch a single listing row by its onchain listing ID.
 * Used by the swap poller to resolve asset_id when handling
 * Cancelled / PriceUpdated / Sold events.
 */
export async function getListingById(listingId: number) {
    const db = getDb();
    const { data } = await db
        .from("listings")
        .select("*")
        .eq("listing_id", listingId)
        .maybeSingle();
    return data ?? null;
}

/**
 * Update only the asking_price of a listing (for PriceUpdated events).
 */
export async function updateListingAskingPrice(
    listingId: number,
    newAskingPrice: string
): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("listings")
        .update({ asking_price: newAskingPrice })
        .eq("listing_id", listingId);
    if (error) throw error;
}

/**
 * Find the lowest asking_price among active listings for a given asset.
 * Called after a Cancelled event to keep current_listing_price accurate
 * when an asset has multiple active listings.
 * Returns null if no active listings remain.
 */
export async function getCheapestActiveListingPrice(assetId: string): Promise<number | null> {
    const db = getDb();
    const { data } = await db
        .from("listings")
        .select("asking_price")
        .eq("asset_id", assetId)
        .eq("status", "active")
        .order("asking_price", { ascending: true })
        .limit(1)
        .maybeSingle();
    return data ? Number(data.asking_price) : null;
}

// ─── Listings: writes (used by cedarxSwap poller) ────────────────────────────

export async function upsertListing(listing: ListingInsert): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("listings")
        .upsert(listing, { onConflict: "listing_id" });
    if (error) throw error;
}

export async function setListingStatus(
    listingId: number,
    status: "active" | "sold" | "cancelled"
): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("listings")
        .update({ status })
        .eq("listing_id", listingId);
    if (error) throw error;
}

// ─── Trades: writes ───────────────────────────────────────────────────────────

export async function insertTrade(trade: TradeInsert): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("trades")
        .insert(trade)
        .throwOnError();
    if (error) throw error;
}

// ─── Seaport orders: reads ────────────────────────────────────────────────────

/**
 * Return the single active Seaport order for an asset, if one exists.
 * Orders are ordered by price ascending so the cheapest is returned.
 */
/**
 * Batch-fetch the cheapest active Seaport order for each of the given asset IDs.
 * Returns a Map from assetId → { price, symbol, decimals } for fast lookup.
 * Used by the assets list endpoint to fill in currentListingPrice when the
 * periodic sync hasn't run yet for a newly-created order.
 */
export async function getSeaportPriceMap(
    assetIds: string[]
): Promise<Map<string, { price: string; symbol: string; decimals: number }>> {
    if (assetIds.length === 0) return new Map();
    const db = getDb();
    const { data } = await db
        .from("seaport_orders")
        .select("asset_id, price, payment_token_symbol, payment_token_decimals")
        .in("asset_id", assetIds)
        .eq("status", "active")
        .order("price", { ascending: true }); // cheapest first

    const map = new Map<string, { price: string; symbol: string; decimals: number }>();
    for (const row of data ?? []) {
        // keep only the cheapest per asset (first occurrence due to ordering)
        if (row.asset_id && !map.has(row.asset_id)) {
            const symbol = row.payment_token_symbol ?? "ETH";
            // Use stored decimals when present and non-zero; otherwise infer from symbol.
            // Stablecoins (USDC, USDT, DAI) use 6 decimals; everything else (ETH, WETH…) = 18.
            const storedDecimals = row.payment_token_decimals;
            const sym = symbol.toUpperCase();
            const decimals = storedDecimals != null && storedDecimals > 0
                ? Number(storedDecimals)
                : (sym === "USDC" || sym === "USDT" || sym === "DAI" ? 6 : 18);
            map.set(row.asset_id, {
                price:   String(row.price),
                symbol,
                decimals,
            });
        }
    }
    return map;
}

export async function getActiveSeaportOrder(assetId: string): Promise<SeaportOrderRow | null> {
    const db = getDb();
    const { data, error } = await db
        .from("seaport_orders")
        .select("*")
        .eq("asset_id", assetId)
        .eq("status", "active")
        .order("price", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data as SeaportOrderRow | null;
}

/**
 * Return all active order hashes for a given asset (used to detect stale orders).
 */
export async function getActiveSeaportOrderHashes(assetId: string): Promise<string[]> {
    const db = getDb();
    const { data, error } = await db
        .from("seaport_orders")
        .select("order_hash")
        .eq("asset_id", assetId)
        .eq("status", "active");
    if (error) throw error;
    return (data ?? []).map((r: { order_hash: string }) => r.order_hash);
}

/**
 * Return all asset_id values grouped by their contract and chain so the
 * Seaport poller can batch OpenSea API calls per contract.
 */
export async function getAllIndexedAssets(): Promise<
    Array<{ id: string; contract_address: string; token_id: string | null; chain: string }>
> {
    const db = getDb();
    const { data, error } = await db
        .from("assets")
        .select("id, contract_address, token_id, chain");
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; contract_address: string; token_id: string | null; chain: string }>;
}

/**
 * Return all currently-active Seaport order hashes and their asset IDs.
 * Used by the Seaport poller to detect and expire stale orders after each tick.
 */
export async function getAllActiveSeaportOrders(): Promise<
    Array<{ order_hash: string; asset_id: string | null }>
> {
    const db = getDb();
    const { data, error } = await (db.from("seaport_orders") as any)
        .select("order_hash, asset_id")
        .eq("status", "active");
    if (error) throw error;
    return (data ?? []) as Array<{ order_hash: string; asset_id: string | null }>;
}

// ─── Seaport orders: writes ───────────────────────────────────────────────────

export async function upsertSeaportOrder(order: SeaportOrderInsert): Promise<void> {
    const db = getDb();
    const { error } = await (db.from("seaport_orders") as any).upsert(
        { ...order, updated_at: new Date().toISOString() },
        { onConflict: "order_hash" }
    );
    if (error) throw error;
}

export async function setSeaportOrderStatus(
    orderHash: string,
    status: "active" | "filled" | "cancelled" | "expired"
): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("seaport_orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("order_hash", orderHash);
    if (error) throw error;
}

/**
 * Mark all active orders for the given hashes as expired (used when OpenSea
 * stops returning them, which means they were filled/cancelled/expired).
 */
export async function expireSeaportOrders(orderHashes: string[]): Promise<void> {
    if (!orderHashes.length) return;
    const db = getDb();
    const { error } = await db
        .from("seaport_orders")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .in("order_hash", orderHashes)
        .eq("status", "active");
    if (error) throw error;
}

/**
 * Update an asset's has_active_listing flag and current_listing_price.
 *
 * current_listing_price is set to the human-readable token amount:
 *   price_raw / 10^payment_token_decimals  (e.g. 7600000 USDC raw → 7.60)
 * It is set to null when no active order exists.
 */
export async function syncAssetSeaportListing(
    assetId: string,
    cheapestOrder: SeaportOrderRow | null
): Promise<void> {
    const db = getDb();

    const update: Record<string, unknown> = {
        has_active_listing: cheapestOrder !== null,
        last_updated: new Date().toISOString(),
    };

    if (cheapestOrder) {
        const sym = cheapestOrder.payment_token_symbol ?? "ETH";
        const storedDec = cheapestOrder.payment_token_decimals;
        const decimals = (storedDec != null && storedDec > 0)
            ? storedDec
            : (sym === "USDC" || sym === "USDT" || sym === "DAI") ? 6 : 18;
        console.log("[syncAssetSeaportListing]", { assetId, rawPrice: cheapestOrder.price, sym, storedDec, decimals });
        update.current_listing_price = Number(cheapestOrder.price) / Math.pow(10, decimals);
        update.current_listing_payment_token_symbol = sym;
    } else {
        update.current_listing_price = null;
        update.current_listing_payment_token_symbol = null;
    }

    const { error } = await db
        .from("assets")
        .update(update)
        .eq("id", assetId);
    if (error) throw error;
}

/**
 * Return all asset IDs currently flagged as having an active listing.
 * Used by the Seaport poller to sweep and clear stale flags on assets
 * whose orders have already been expired in a previous tick.
 */
export async function getAssetsWithActiveListing(): Promise<string[]> {
    const db = getDb();
    const { data, error } = await db
        .from("assets")
        .select("id")
        .eq("has_active_listing", true);
    if (error) throw error;
    return (data ?? []).map((r: { id: string }) => r.id);
}

// ─── Indexer cursors ──────────────────────────────────────────────────────────

export async function getCursor(pollerId: string): Promise<number> {
    const db = getDb();
    const { data, error } = await db
        .from("indexer_cursors")
        .select("last_block")
        .eq("poller_id", pollerId)
        .single();
    if (error) throw error;
    return data?.last_block ?? 0;
}

export async function setCursor(pollerId: string, lastBlock: number): Promise<void> {
    const db = getDb();
    const { error } = await db
        .from("indexer_cursors")
        .update({ last_block: lastBlock, updated_at: new Date().toISOString() })
        .eq("poller_id", pollerId);
    if (error) throw error;
}
