/**
 * Cross-tab count cache — pre-computed asset counts per (category|protocol, status).
 *
 * Runs once per SeaportPoller tick. Results are stored in the shared TTL cache
 * so every subsequent request for a count is served from memory (<1 ms) instead
 * of running COUNT(*) against 293 K rows.
 *
 * Shape:
 *   CrossTabCounts["real-estate"]["listed"]    → number of listed RE assets
 *   CrossTabCounts[""]["all"]                  → total assets across all categories
 *   CrossTabCounts["protocol:fabrica"]["unlisted"] → Fabrica unlisted count (~92)
 */

import { getDb } from "../db/client";
import { cache } from "./cache";

export const CROSSTAB_CACHE_KEY = "stats:counts-crosstab";
const CROSSTAB_TTL = 10 * 60_000; // 10 minutes (poller refreshes sooner anyway)

export type StatusKey = "listed" | "unlisted" | "all";

export type CrossTabCounts = {
    [categoryKey: string]: Record<StatusKey, number>;
};

// Category groups — mirrors the aliasing in getAssets().
const CATEGORY_GROUPS: Array<{ key: string; values: string[] | null; protocol?: string }> = [
    { key: "",                   values: null },                          // all categories
    { key: "real-estate",        values: ["real-estate", "land"] },
    { key: "collectibles",       values: ["collectibles"] },
    { key: "luxury-goods",       values: ["luxury-goods", "watches"] },
    { key: "watches",            values: ["watches"] },
    { key: "art",                values: ["art"] },
    // Protocol-specific counts for the land marketplace
    { key: "protocol:fabrica",   values: null, protocol: "fabrica" },
];

// Common filters that mirror getAssets() exclusions.
function baseQuery(db: ReturnType<typeof getDb>) {
    return db.from("assets")
        .select("id", { count: "exact", head: true })
        .not("name", "match", "^#[0-9]")
        .or("name.not.is.null,image_url.not.is.null");
}

async function countOne(
    db: ReturnType<typeof getDb>,
    values: string[] | null,
    status: StatusKey,
    protocol?: string,
): Promise<number> {
    let q = baseQuery(db);
    if (values) q = q.in("category", values);
    if (protocol) q = q.eq("protocol", protocol);
    if (status === "listed") {
        q = q.eq("has_active_listing", true).not("current_listing_price", "is", null);
    } else if (status === "unlisted") {
        // Match assets not actively listed: false OR NULL
        q = (q as any).or("has_active_listing.eq.false,has_active_listing.is.null");
    }
    // "all" → no listing filter
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
}

/**
 * Runs parallel HEAD-only COUNT queries (7 groups × 3 statuses = 21)
 * and stores the result in the shared cache.  Called from SeaportPoller.tick().
 */
export async function refreshCrossTabCounts(): Promise<void> {
    const db = getDb();
    const statuses: StatusKey[] = ["listed", "unlisted", "all"];

    // 21 queries in parallel — all HEAD, no rows fetched, typically 20-80 ms total
    const tasks: Array<{ key: string; status: StatusKey; promise: Promise<number> }> = [];
    for (const { key, values, protocol } of CATEGORY_GROUPS) {
        for (const status of statuses) {
            tasks.push({ key, status, promise: countOne(db, values, status, protocol) });
        }
    }

    const results = await Promise.allSettled(tasks.map(t => t.promise));

    const counts: CrossTabCounts = {};
    for (let i = 0; i < tasks.length; i++) {
        const { key, status } = tasks[i];
        if (!counts[key]) counts[key] = { listed: 0, unlisted: 0, all: 0 };
        const r = results[i];
        if (r.status === "fulfilled") counts[key][status] = r.value;
    }

    cache.set(CROSSTAB_CACHE_KEY, counts, CROSSTAB_TTL);
}

/**
 * Look up a pre-computed count. Returns undefined if the crosstab isn't cached
 * yet (before the first poller tick completes).
 */
export function lookupCrossTab(
    catKey: string,
    status: StatusKey,
): number | undefined {
    const crosstab = cache.get<CrossTabCounts>(CROSSTAB_CACHE_KEY);
    return crosstab?.[catKey]?.[status];
}
