/**
 * Cache warming — proactively pre-fetches the most-visited Explore page
 * combos immediately after a SeaportPoller tick so the first real request
 * for each combo is served from memory (<1 ms) rather than hitting the DB.
 *
 * Only warms pages that aren't already in cache (avoids redundant work when
 * the tick runs but listings haven't changed much).
 */

import { getAssets, getSeaportPriceMap } from "../db/queries";
import { formatAsset } from "./formatAsset";
import { cache } from "./cache";

const ASSETS_LIST_TTL = 60_000; // mirrors the TTL in routes/assets.ts

// The (category, listingFilter, sort, limit) combos that account for the
// vast majority of Explore page traffic.  All use sort=newest, page=1.
const WARM_COMBOS: Array<{ category?: string; listingFilter: "listed" | "unlisted" | "all" }> = [
    { listingFilter: "listed" },                              // /explore default
    { category: "real-estate",  listingFilter: "listed" },
    { category: "collectibles", listingFilter: "listed" },
    { category: "luxury-goods", listingFilter: "listed" },
    { category: "watches",      listingFilter: "listed" },
];

/** Build the cache key that routes/assets.ts uses for a given combo. */
function warmCacheKey(category: string | undefined, listingFilter: string): string {
    const params = new URLSearchParams({
        sort:          "newest",
        page:          "1",
        limit:         "24",
        listingFilter,
    });
    if (category) params.set("category", category);
    // Match the key format: `assets:list:${req.url}` where req.url = /api/assets?...
    // URLSearchParams sorts keys alphabetically — mirror by using the same insertion order
    // as the frontend (sort, page, limit, listingFilter, category).
    return `assets:list:/api/assets?${params.toString()}`;
}

export async function warmCommonQueries(): Promise<void> {
    await Promise.allSettled(
        WARM_COMBOS.map(async ({ category, listingFilter }) => {
            const key = warmCacheKey(category, listingFilter);
            // Skip if already warm — the tick just cleared the old entries so
            // this will almost always be a miss, but guard against double-runs.
            if (cache.get<object>(key)) return;

            try {
                const result = await getAssets({
                    sort: "newest",
                    page: 1,
                    limit: 24,
                    listingFilter,
                    ...(category ? { category } : {}),
                });

                const needsPrice = result.data
                    .filter(r => r.has_active_listing && r.current_listing_price == null)
                    .map(r => r.id);
                const seaportPrices = await getSeaportPriceMap(needsPrice);

                const body = {
                    data: result.data.map(row => formatAsset(row, seaportPrices)),
                    pagination: {
                        total:    result.total,
                        page:     result.page,
                        limit:    result.limit,
                        hasMore:  result.hasMore,
                        ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
                    },
                };
                cache.set(key, body, ASSETS_LIST_TTL);
            } catch {
                // Warming failures are non-fatal — the route will fetch on demand.
            }
        })
    );
}
