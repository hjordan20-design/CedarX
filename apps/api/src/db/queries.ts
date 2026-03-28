/**
 * Query helpers for the CedarX indexer.
 *
 * All reads go through these functions so SQL logic stays centralised.
 * The Express routes call these; the pollers call the write helpers.
 */

import { getDb } from "./client";
import type { AssetInsert, AssetRow, ListingInsert, TradeInsert, SeaportOrderInsert, SeaportOrderRow, SeaportOfferInsert } from "./types";

// ─── Types returned by queries ────────────────────────────────────────────────

export interface AssetFilters {
    category?: string;
    protocol?: string;
    chain?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "price_asc" | "price_desc" | "newest" | "volume" | "acreage_asc" | "acreage_desc";
    search?: string;
    page?: number;
    limit?: number;
    /**
     * Three-way listing filter:
     *  "listed"   — only assets with has_active_listing=true and a price (default)
     *  "unlisted" — only assets with has_active_listing=false
     *  "all"      — no listing filter
     */
    listingFilter?: "listed" | "unlisted" | "all";
    /** @deprecated Use listingFilter="listed" instead. Kept for backward compat. */
    listedOnly?: boolean;
    /**
     * Cursor for O(1) deep pagination when sort=newest.
     * Pass the `nextCursor` from the previous page's response.
     * When provided, `page` is used only for display — the cursor drives the query.
     */
    cursor?: string;
    /** Land-specific filters — applied to the details JSONB column. */
    state?: string;
    county?: string;
    minAcreage?: number;
    maxAcreage?: number;
}

export interface ListingFilters {
    category?: string;
    sort?: "price_asc" | "price_desc" | "newest";
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    /**
     * Total matching row count, or `null` when the query is expected to be
     * large (listingFilter !== "listed") and counting is skipped for performance.
     * The frontend shows "Many results" and falls back to prev/next pagination.
     */
    total: number | null;
    page: number;
    limit: number;
    hasMore: boolean;
    /**
     * Cursor for the next page — the `created_at` of the last item in this
     * result set. Only present when sort=newest and a full page was returned.
     * Pass as `cursor` on the next request to avoid OFFSET scanning.
     */
    nextCursor?: string;
}

// ─── Assets: reads ────────────────────────────────────────────────────────────

export async function getAssets(filters: AssetFilters = {}): Promise<PaginatedResult<AssetRow>> {
    const db = getDb();
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    // Skip the COUNT(*) query for non-listed filters (could scan 260K–293K rows).
    // "listed" is always fast (<5 K rows); everything else returns total: null.
    const effectiveFilterForCount = filters.listingFilter
        ?? (filters.listedOnly === false ? "all" : "listed");
    const doCount = effectiveFilterForCount === "listed";

    let query = doCount
        ? db.from("assets").select("*", { count: "exact" })
        : db.from("assets").select("*");

    // Exclude placeholder / no-metadata assets:
    //   1. Name matches "^#\d" — raw token-ID strings like "#425122922..."
    //   2. Both name AND image_url are null — fully empty records
    // These are valid on-chain tokens but provide no browseable information.
    query = query
        .not("name", "match", "^#[0-9]")
        .or("name.not.is.null,image_url.not.is.null");

    if (filters.category) {
        const cat = filters.category.toLowerCase();
        // "real-estate" encompasses Fabrica's legacy "land" category.
        // "luxury-goods" encompasses the newer "watches" sub-category.
        const values =
            cat === "real-estate"   ? ["real-estate", "land"] :
            cat === "luxury-goods"  ? ["luxury-goods", "watches"] :
            [cat];
        query = query.in("category", values);
    }
    if (filters.protocol) query = query.eq("protocol", filters.protocol);
    if (filters.chain)    query = query.eq("chain", filters.chain);
    // Resolve the effective listing filter: explicit listingFilter takes priority,
    // then fall back to the deprecated listedOnly flag, then default to "listed".
    const effectiveFilter = filters.listingFilter
        ?? (filters.listedOnly === false ? "all" : filters.listedOnly ? "listed" : "listed");

    if (effectiveFilter === "listed") {
        // has_active_listing is the canonical source of truth: it's set true by
        // syncAssetSeaportListing whenever an active Seaport order exists, and
        // false when the last order expires/fills.
        query = query.eq("has_active_listing", true);
        // In browse mode (no search), also require a non-null price so every
        // card renders a dollar amount.  When the user is searching by name we
        // relax this: the asset should be findable even if its price hasn't been
        // synced yet.
        if (!filters.search) {
            query = query.not("current_listing_price", "is", null);
        }
    } else if (effectiveFilter === "unlisted") {
        // Match assets not actively listed: has_active_listing = false OR NULL
        // (Fabrica land assets that have never been listed have NULL, not false)
        query = (query as any).or("has_active_listing.eq.false,has_active_listing.is.null");
    }
    // "all" → no listing filter applied
    if (filters.minPrice != null) query = query.gte("current_listing_price", filters.minPrice);
    if (filters.maxPrice != null) query = query.lte("current_listing_price", filters.maxPrice);
    if (filters.search) {
        const s = filters.search.replace(/'/g, "''");
        query = query.or(`name.ilike.%${s}%,protocol.ilike.%${s}%`);
    }
    // Land-specific JSONB filters
    if (filters.state)        query = (query as any).filter("details->>state", "ilike", filters.state);
    if (filters.county)       query = (query as any).filter("details->>county", "ilike", filters.county);
    if (filters.minAcreage != null) query = (query as any).filter("(details->>acreage)::numeric", "gte", filters.minAcreage);
    if (filters.maxAcreage != null) query = (query as any).filter("(details->>acreage)::numeric", "lte", filters.maxAcreage);

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
        case "acreage_asc":
            query = (query as any).order("details->>acreage", { ascending: true, nullsFirst: false });
            break;
        case "acreage_desc":
            query = (query as any).order("details->>acreage", { ascending: false, nullsFirst: false });
            break;
        case "newest":
        default:
            query = query.order("created_at", { ascending: false });
            break;
    }

    // Cursor-based pagination: when sort=newest and a cursor is provided, use
    // WHERE created_at < cursor instead of OFFSET so deep pages are O(1).
    const useCursor = (filters.sort === "newest" || !filters.sort) && filters.cursor != null;
    if (useCursor) {
        query = query.lt("created_at", filters.cursor!);
        query = query.range(0, limit - 1);
    } else {
        query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const total: number | null = doCount ? (count ?? 0) : null;

    // Provide nextCursor for future O(1) pagination on the newest sort.
    const nextCursor =
        rows.length === limit && (filters.sort === "newest" || !filters.sort)
            ? (rows[rows.length - 1] as unknown as { created_at: string }).created_at
            : undefined;

    return {
        data: rows,
        total,
        page,
        limit,
        // When total is null, infer hasMore from whether we got a full page.
        hasMore: total !== null ? offset + limit < total : rows.length >= limit,
        nextCursor,
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
        // Total indexed assets — land only
        db.from("assets").select("id", { count: "exact", head: true })
            .eq("protocol", "fabrica"),

        // Active listing count — Fabrica land only
        db.from("assets").select("id", { count: "exact", head: true })
            .eq("protocol", "fabrica")
            .eq("has_active_listing", true)
            .not("current_listing_price", "is", null),

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

// ─── Category counts ──────────────────────────────────────────────────────────

/**
 * Returns approximate asset counts per category.
 * Uses listingFilter="listed" by default so counts match what users browse.
 * Rounds large counts to nearest thousand with "+" suffix.
 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
    const db = getDb();

    // Fetch count for each canonical category in parallel (head queries = fast)
    const CATEGORIES = [
        { key: "real-estate",  values: ["real-estate", "land"] },
        { key: "collectibles", values: ["collectibles"] },
        { key: "luxury-goods", values: ["luxury-goods", "watches"] },
        { key: "watches",      values: ["watches"] },
        { key: "art",          values: ["art"] },
    ];

    const results = await Promise.all(
        CATEGORIES.map(({ values }) =>
            db.from("assets")
              .select("id", { count: "exact", head: true })
              .in("category", values)
              .or("name.not.is.null,image_url.not.is.null")
        )
    );

    const counts: Record<string, number> = {};
    for (let i = 0; i < CATEGORIES.length; i++) {
        const { count, error } = results[i];
        if (!error) counts[CATEGORIES[i].key] = count ?? 0;
    }

    return counts;
}

// ─── Land property distinct values ────────────────────────────────────────────

/**
 * Returns all distinct US states present in the Fabrica asset catalogue.
 * Filters to protocol=fabrica to stay land-focused.
 */
export async function getPropertyStates(): Promise<string[]> {
    const db = getDb();
    const { data, error } = await (db as any)
        .from("assets")
        .select("details")
        .eq("protocol", "fabrica")
        .not("details", "is", null) as { data: { details: Record<string, unknown> }[] | null; error: { message: string } | null };
    if (error) throw error;
    const states = new Set<string>();
    for (const row of data ?? []) {
        const s = row.details?.state;
        if (typeof s === "string" && s.trim()) states.add(s.trim());
    }
    return Array.from(states).sort();
}

/**
 * Returns all distinct counties present in Fabrica assets.
 * Optionally filter by state.
 */
export async function getPropertyCounties(state?: string): Promise<string[]> {
    const db = getDb();
    let query: any = (db as any)
        .from("assets")
        .select("details")
        .eq("protocol", "fabrica")
        .not("details", "is", null);
    if (state) query = query.filter("details->>state", "ilike", state);
    const { data, error } = await query as { data: { details: Record<string, unknown> }[] | null; error: { message: string } | null };
    if (error) throw error;
    const counties = new Set<string>();
    for (const row of data ?? []) {
        const c = row.details?.county;
        if (typeof c === "string" && c.trim()) counties.add(c.trim());
    }
    return Array.from(counties).sort();
}

// ─── Trending assets (by offer count) ────────────────────────────────────────

export async function getTrendingAssets(limit = 8): Promise<AssetRow[]> {
    const db = getDb();

    // Tally active/accepted offers per asset
    const { data: offerRows, error: offerErr } = await db
        .from("seaport_offers")
        .select("asset_id")
        .in("status", ["active", "accepted"])
        .not("asset_id", "is", null);

    if (!offerErr && offerRows && offerRows.length > 0) {
        const counts: Record<string, number> = {};
        for (const row of offerRows) {
            if (row.asset_id) counts[row.asset_id] = (counts[row.asset_id] ?? 0) + 1;
        }
        const topIds = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([id]) => id);

        if (topIds.length > 0) {
            const { data: assets, error: assetsErr } = await db
                .from("assets")
                .select("*")
                .in("id", topIds)
                .eq("protocol", "fabrica")
                .not("name", "match", "^#[0-9]");

            if (!assetsErr && assets && assets.length > 0) {
                return topIds
                    .map((id) => assets.find((a) => a.id === id))
                    .filter((a): a is AssetRow => a != null);
            }
        }
    }

    // Fallback: most recently updated listed Fabrica assets with images
    const { data, error } = await db
        .from("assets")
        .select("*")
        .eq("protocol", "fabrica")
        .eq("has_active_listing", true)
        .not("name", "match", "^#[0-9]")
        .not("image_url", "is", null)
        .order("last_updated", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data ?? [];
}

// ─── Asset price/listing history ──────────────────────────────────────────────

export async function getAssetPriceHistory(assetId: string, limit = 20) {
    const db = getDb();
    const { data, error } = await db
        .from("seaport_orders")
        .select("order_hash, price, payment_token_symbol, payment_token_decimals, status, created_at, expiration")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data ?? [];
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

    // If the incoming image_url is null, preserve an existing one so a metadata
    // re-fetch that happens to return no image doesn't clobber a previously good URL.
    let imageUrl = asset.image_url ?? null;
    if (!imageUrl) {
        const { data: existing } = await db
            .from("assets")
            .select("image_url")
            .eq("id", asset.id)
            .maybeSingle();
        if (existing?.image_url) imageUrl = existing.image_url;
    }

    const { error } = await db
        .from("assets")
        .upsert({ ...asset, image_url: imageUrl, last_updated: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
}

/**
 * Delist all Fabrica assets whose token_id is NOT in the provided list.
 * Called after a full RETS feed sync so assets no longer in the feed are
 * correctly marked as unlisted.
 * Returns the count of rows updated.
 */
export async function delistFabricaAssetsNotIn(activeTokenIds: string[]): Promise<number> {
    const db = getDb();

    // Safety guard: never wipe everything if the active list is empty.
    if (activeTokenIds.length === 0) return 0;

    // Supabase JS client doesn't support NOT IN with an array parameter directly,
    // so we use the PostgREST `not` filter with the `in` operator.
    const { data, error } = await (db as any)
        .from("assets")
        .update({
            has_active_listing: false,
            current_listing_price: null,
            current_listing_payment_token_symbol: null,
            last_updated: new Date().toISOString(),
        })
        .eq("protocol", "fabrica")
        .eq("has_active_listing", true)
        .not("token_id", "in", `(${activeTokenIds.map(id => `"${id}"`).join(",")})`)
        .select("id");

    if (error) throw error;
    return (data as unknown[])?.length ?? 0;
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
 * Return all active Seaport orders whose stored signature is null (JSON null or
 * absent).  Used by the backfill pass to re-fetch signatures from OpenSea.
 */
export async function getActiveOrdersWithNullSignature(): Promise<
    Array<{ order_hash: string; chain: string }>
> {
    const db = getDb();
    // PostgREST JSONB text-extraction filter: order_parameters->>'signature' IS NULL
    const { data, error } = await (db.from("seaport_orders") as any)
        .select("order_hash, chain")
        .eq("status", "active")
        .filter("order_parameters->>signature", "is", null);
    if (error) throw error;
    return (data ?? []) as Array<{ order_hash: string; chain: string }>;
}

/**
 * Patch only the signature key inside the order_parameters JSONB column.
 * Does a read-modify-write so the parameters sub-object is preserved exactly.
 */
export async function patchOrderSignature(
    orderHash: string,
    signature: string
): Promise<void> {
    const db = getDb();
    const { data, error: fetchErr } = await db
        .from("seaport_orders")
        .select("order_parameters")
        .eq("order_hash", orderHash)
        .single();
    if (fetchErr) throw fetchErr;
    if (!data) return;

    const updated = { ...(data.order_parameters as Record<string, unknown>), signature };
    const { error } = await db
        .from("seaport_orders")
        .update({ order_parameters: updated, updated_at: new Date().toISOString() })
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
        const sym = (cheapestOrder.payment_token_symbol ?? "ETH").toUpperCase();
        const storedDec = Number(cheapestOrder.payment_token_decimals);
        // Use stored decimals when explicitly set (> 0); otherwise infer from symbol.
        // USDC (including USDC.e on Polygon), USDT, DAI → 6 decimals.
        // Everything else (ETH, WETH, …) → 18 decimals.
        const decimals = storedDec > 0
            ? storedDec
            : (sym.startsWith("USDC") || sym === "USDT" || sym === "DAI") ? 6 : 18;
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
 * One-off backfill: re-sync current_listing_price for every asset that has at
 * least one active Seaport order.  Prices stored before the decimal-division
 * fix were raw (undivided) amounts; this corrects them in-place.
 *
 * Returns the number of assets updated.
 */
export async function backfillSeaportPrices(): Promise<number> {
    const db = getDb();

    // Fetch all active orders (asset_id, price, symbol, decimals)
    const { data: orders, error } = await (db.from("seaport_orders") as any)
        .select("asset_id, price, payment_token_symbol, payment_token_decimals")
        .eq("status", "active")
        .not("asset_id", "is", null);
    if (error) throw error;

    // Keep only the cheapest order per asset_id
    const cheapest = new Map<string, { price: string; payment_token_symbol: string; payment_token_decimals: number }>();
    for (const row of (orders ?? []) as Array<{ asset_id: string; price: string; payment_token_symbol: string; payment_token_decimals: number }>) {
        const prev = cheapest.get(row.asset_id);
        if (!prev || Number(row.price) < Number(prev.price)) {
            cheapest.set(row.asset_id, row);
        }
    }

    let count = 0;
    for (const [assetId, order] of cheapest) {
        await syncAssetSeaportListing(assetId, order as any);
        count++;
    }
    return count;
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

// ─── Seaport offers: writes ───────────────────────────────────────────────────

/**
 * Insert a new buyer offer created through the CedarX native offer flow.
 * Each offer generates a new UUID row (not upserted — duplicate offers are OK).
 */
export async function upsertSeaportOffer(offer: SeaportOfferInsert): Promise<void> {
    const db = getDb();
    const { error } = await (db.from("seaport_offers") as any).insert({
        ...offer,
        created_at: new Date().toISOString(),
    });
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

// ─── API keys ────────────────────────────────────────────────────────────────

/**
 * Look up an API key by its bearer value (the UUID sent in X-CedarX-API-Key).
 * Returns the key's metadata if found and active, null otherwise.
 */
export async function lookupApiKey(
    key: string
): Promise<{ owner: string; rate_limit: number } | null> {
    const db = getDb();
    const { data } = await (db.from("api_keys") as any)
        .select("owner, rate_limit")
        .eq("key", key)
        .maybeSingle();
    return (data as { owner: string; rate_limit: number } | null) ?? null;
}

// ─── Collection sweep cursors ─────────────────────────────────────────────────
//
// The collection sweep poller paginates OpenSea's /collection/{slug}/nfts
// endpoint using opaque string cursors (not block numbers).  We store these
// in the cursor_text column added to indexer_cursors.

/**
 * Return the stored OpenSea pagination cursor for a collection sweep poller.
 * Returns null if no cursor is stored (sweep hasn't started or has completed).
 */
export async function getSweepCursor(pollerId: string): Promise<string | null> {
    const db = getDb();
    const { data, error } = await db
        .from("indexer_cursors")
        .select("cursor_text")
        .eq("poller_id", pollerId)
        .maybeSingle();
    if (error) {
        console.error(`[getSweepCursor] DB error for ${pollerId}:`, error.message ?? error);
        return null;
    }
    return data?.cursor_text ?? null;
}

/**
 * Persist the current OpenSea pagination cursor for a collection sweep poller.
 * Pass null to indicate the sweep has completed (cursor will be cleared).
 */
export async function setSweepCursor(pollerId: string, cursor: string | null): Promise<void> {
    const db = getDb();
    const { error } = await db.from("indexer_cursors").upsert(
        {
            poller_id:   pollerId,
            last_block:  0,
            cursor_text: cursor,
            updated_at:  new Date().toISOString(),
        },
        { onConflict: "poller_id" }
    );
    if (error) throw error;
}

// ─── Seaport user activity ────────────────────────────────────────────────────

/**
 * Return all Seaport orders where the caller is the seller.
 * Used by the /activity page to show "My Listings".
 */
export async function getUserSeaportOrders(address: string) {
    const db = getDb();
    const { data, error } = await (db.from("seaport_orders") as any)
        .select("order_hash, asset_id, chain, price, payment_token_symbol, payment_token_decimals, expiration, status, created_at, order_parameters")
        .eq("seller_address", address.toLowerCase())
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Array<Record<string, unknown>>;
}

/**
 * Return all Seaport offers placed by the given address.
 * Used by the /activity page to show "My Offers".
 */
export async function getUserSeaportOffers(address: string) {
    const db = getDb();
    const { data, error } = await (db.from("seaport_offers") as any)
        .select("id, asset_id, amount, payment_token_symbol, payment_token_decimals, status, expires_at, created_at, order_hash, order_parameters")
        .eq("offerer_address", address.toLowerCase())
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Array<Record<string, unknown>>;
}

/**
 * Batch-fetch minimal asset display fields for a list of asset IDs.
 * Used to enrich user listings and offers with asset metadata.
 */
export async function getAssetsByIds(ids: string[]): Promise<Array<{ id: string; name: string; image_url: string | null; token_id: string | null; contract_address: string; chain: string }>> {
    if (ids.length === 0) return [];
    const db = getDb();
    const { data, error } = await db
        .from("assets")
        .select("id, name, image_url, token_id, contract_address, chain")
        .in("id", ids);
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; name: string; image_url: string | null; token_id: string | null; contract_address: string; chain: string }>;
}

/**
 * Update the status of a seaport_offer row.
 */
export async function setSeaportOfferStatus(
    id: string,
    status: "active" | "accepted" | "cancelled" | "expired"
): Promise<void> {
    const db = getDb();
    const { error } = await (db.from("seaport_offers") as any)
        .update({ status })
        .eq("id", id);
    if (error) throw error;
}

// ─── Collection sweep asset upsert ────────────────────────────────────────────

/**
 * Upsert an asset row discovered during a collection sweep.
 *
 * Behaviour on conflict differs from the plain upsertAsset:
 *   - If the asset already exists: only update display metadata (name,
 *     description, image_url, details, external_url).  has_active_listing
 *     and current_listing_price are intentionally left untouched so an
 *     active listing is never accidentally cleared by a metadata refresh.
 *   - If the asset is new: insert with has_active_listing = false.
 *
 * Returns true if a new row was inserted, false if an existing row was updated.
 */
export async function upsertAssetFromSweep(asset: AssetInsert): Promise<boolean> {
    const db = getDb();

    // Check whether the asset is already indexed.
    const { data: existing } = await db
        .from("assets")
        .select("id")
        .eq("id", asset.id)
        .maybeSingle();

    if (existing) {
        // Update only safe metadata fields — do NOT touch listing state.
        const { error } = await db
            .from("assets")
            .update({
                name:         asset.name,
                description:  asset.description ?? null,
                image_url:    asset.image_url ?? null,
                details:      asset.details,
                external_url: asset.external_url ?? null,
                last_updated: new Date().toISOString(),
            })
            .eq("id", asset.id);
        if (error) throw error;
        return false;
    }

    // New asset — full insert with has_active_listing = false.
    const { error } = await db
        .from("assets")
        .insert({
            ...asset,
            has_active_listing: false,
            last_updated:       new Date().toISOString(),
        });
    // Ignore unique-violation (race between parallel sweep pages).
    if (error && error.code !== "23505") throw error;
    return !error;
}
