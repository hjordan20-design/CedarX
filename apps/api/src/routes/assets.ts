import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAsset, getAssets, getAssetHistory, getSeaportPriceMap, getTrendingAssets, type AssetFilters } from "../db/queries";
import { cache } from "../lib/cache";
import { formatAsset, type SeaportPriceMap } from "../lib/formatAsset";
import { lookupCrossTab, type StatusKey } from "../lib/countCache";

export const assetsRouter = Router();

// Cache TTLs
const ASSETS_LIST_TTL  = 60_000;  //  1 minute
const TRENDING_TTL     = 300_000; //  5 minutes

// ─── GET /api/assets ─────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
    category:         z.enum(["real-estate", "luxury-goods", "art", "collectibles", "watches", "digital-passports"]).optional(),
    protocol:         z.enum(["fabrica", "4k", "courtyard", "arianee"]).optional(),
    chain:            z.enum(["ethereum", "polygon"]).optional(),
    minPrice:         z.coerce.number().nonnegative().optional(),
    maxPrice:         z.coerce.number().nonnegative().optional(),
    sort:             z.enum(["price_asc", "price_desc", "newest", "volume", "acreage_asc", "acreage_desc"]).optional(),
    search:           z.string().max(100).optional(),
    // Three-way listing filter (preferred)
    listingFilter:    z.enum(["listed", "unlisted", "all"]).optional(),
    // Legacy boolean flag — kept for backward compat; mapped to listingFilter below
    listedOnly:       z.coerce.boolean().optional(),
    // Also accept ?has_active_listing=true (exact column filter)
    has_active_listing: z.coerce.boolean().optional(),
    page:             z.coerce.number().int().positive().default(1),
    limit:            z.coerce.number().int().positive().max(200).default(20),
    // Cursor for O(1) deep pagination (sort=newest only); value is a created_at timestamp
    cursor:           z.string().optional(),
    // Land-specific filters
    state:            z.string().max(100).optional(),
    county:           z.string().max(100).optional(),
    minAcreage:       z.coerce.number().nonnegative().optional(),
    maxAcreage:       z.coerce.number().nonnegative().optional(),
});

assetsRouter.get("/", async (req: Request, res: Response) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }

    // Resolve effective listingFilter:
    //   1. Explicit ?listingFilter=listed|unlisted|all takes highest priority
    //   2. Legacy ?listedOnly=false or ?has_active_listing=false → "all"
    //   3. Legacy ?listedOnly=true or ?has_active_listing=true  → "listed"
    //   4. Default → "listed" (marketplace shows buyable assets first)
    let listingFilter = parsed.data.listingFilter;
    if (!listingFilter) {
        const legacyOff = parsed.data.listedOnly === false || parsed.data.has_active_listing === false;
        const legacyOn  = parsed.data.listedOnly === true  || parsed.data.has_active_listing === true;
        listingFilter   = legacyOff ? "all" : legacyOn ? "listed" : "listed";
    }

    // ── Cache check ──────────────────────────────────────────────────────────
    const cacheKey = `assets:list:${req.url}`;
    const hit = cache.get<object>(cacheKey);
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=60");
        res.setHeader("X-Cache", "HIT");
        return res.json(hit);
    }

    const filters: AssetFilters = {
        ...parsed.data,
        listingFilter,
    };
    const result = await getAssets(filters);

    // For assets that have an active listing but no price synced yet, fall back to
    // the cheapest active Seaport order price fetched in one batch query.
    const needsPrice = result.data
        .filter(r => r.has_active_listing && r.current_listing_price == null)
        .map(r => r.id);
    const seaportPrices = await getSeaportPriceMap(needsPrice);

    // When the query skipped COUNT (total=null), try to serve the count from the
    // pre-computed cross-tab cache instead of leaving it null.  Only substitute
    // when there's no free-text search (cross-tab counts are category-wide totals).
    let effectiveTotal = result.total;
    let effectiveHasMore = result.hasMore;
    if (result.total === null && !filters.search) {
        const catKey = (filters.category ?? "") as string;
        const statusKey = listingFilter as StatusKey;
        const precomputed = lookupCrossTab(catKey, statusKey);
        if (precomputed !== undefined) {
            effectiveTotal = precomputed;
            effectiveHasMore = (result.page * result.limit) < precomputed;
        }
    }

    const body = {
        data: result.data.map(row => formatAsset(row, seaportPrices)),
        pagination: {
            total: effectiveTotal,
            page: result.page,
            limit: result.limit,
            hasMore: effectiveHasMore,
            ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        },
    };
    cache.set(cacheKey, body, ASSETS_LIST_TTL);
    res.setHeader("Cache-Control", "public, max-age=60");
    res.setHeader("X-Cache", "MISS");
    return res.json(body);
});

// ─── GET /api/assets/trending ────────────────────────────────────────────────

assetsRouter.get("/trending", async (_req: Request, res: Response) => {
    const hit = cache.get<object>("assets:trending");
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=300");
        res.setHeader("X-Cache", "HIT");
        return res.json(hit);
    }

    const assets = await getTrendingAssets(8);
    const seaportPrices = await getSeaportPriceMap(
        assets.filter(a => a.has_active_listing && a.current_listing_price == null).map(a => a.id)
    );
    const body = { data: assets.map(row => formatAsset(row, seaportPrices)) };
    cache.set("assets:trending", body, TRENDING_TTL);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Cache", "MISS");
    return res.json(body);
});

// ─── GET /api/assets/:id ─────────────────────────────────────────────────────

assetsRouter.get("/:id", async (req: Request, res: Response) => {
    const asset = await getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    const seaportPrices = (asset.has_active_listing && asset.current_listing_price == null)
        ? await getSeaportPriceMap([asset.id])
        : undefined;
    return res.json(formatAsset(asset, seaportPrices));
});

// ─── GET /api/assets/:id/history ─────────────────────────────────────────────

assetsRouter.get("/:id/history", async (req: Request, res: Response) => {
    const asset = await getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const history = await getAssetHistory(req.params.id, limit);
    return res.json({ data: history });
});

// formatAsset is defined in ../lib/formatAsset (imported above)
