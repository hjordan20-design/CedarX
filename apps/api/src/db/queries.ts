/**
 * Query helpers for the CedarX indexer.
 *
 * All reads go through these functions so SQL logic stays centralised.
 * The Express routes call these; the pollers call the write helpers.
 */

import { getDb } from "./client";
import type { AssetInsert, AssetRow, ListingInsert, TradeInsert } from "./types";

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
