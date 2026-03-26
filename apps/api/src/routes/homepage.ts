/**
 * GET /api/homepage
 *
 * Returns all data needed to render the CedarX homepage in a single request:
 *   - stats      : total assets, active listings, volume
 *   - listings   : first 8 newest listed assets (for HomeAssetGrid)
 *   - trending   : up to 8 assets with the most offer activity (for TrendingSection)
 *
 * Cached server-side for 60 seconds; invalidated after each SeaportPoller tick.
 */
import { Router, type Request, type Response } from "express";
import { getStats, getAssets, getTrendingAssets, getSeaportPriceMap } from "../db/queries";
import { cache } from "../lib/cache";
import { formatAsset } from "../lib/formatAsset";

export const homepageRouter = Router();

const HOMEPAGE_TTL = 60_000;
const CACHE_KEY    = "homepage:main";

homepageRouter.get("/", async (_req: Request, res: Response) => {
    const hit = cache.get<object>(CACHE_KEY);
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=60");
        res.setHeader("X-Cache", "HIT");
        return res.json(hit);
    }

    const [statsResult, listingsResult, trendingResult] = await Promise.all([
        getStats(),
        getAssets({ sort: "newest", listingFilter: "listed", page: 1, limit: 8 }),
        getTrendingAssets(8),
    ]);

    // Apply Seaport price fallback for assets missing current_listing_price
    const allAssets = [...listingsResult.data, ...trendingResult];
    const needsPrice = allAssets
        .filter(r => r.has_active_listing && r.current_listing_price == null)
        .map(r => r.id);
    const seaportPrices = await getSeaportPriceMap(needsPrice);

    const body = {
        stats: statsResult,
        listings: {
            data: listingsResult.data.map(row => formatAsset(row, seaportPrices)),
            pagination: {
                total: listingsResult.total,
                page: listingsResult.page,
                limit: listingsResult.limit,
                hasMore: listingsResult.hasMore,
            },
        },
        trending: trendingResult.map(row => formatAsset(row, seaportPrices)),
    };

    cache.set(CACHE_KEY, body, HOMEPAGE_TTL);
    res.setHeader("Cache-Control", "public, max-age=60");
    res.setHeader("X-Cache", "MISS");
    return res.json(body);
});
