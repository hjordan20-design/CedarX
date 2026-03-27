import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getStats, getProtocols, getCategoryCounts, getPropertyStates, getPropertyCounties } from "../db/queries";
import { cache } from "../lib/cache";
import { CROSSTAB_CACHE_KEY, type CrossTabCounts } from "../lib/countCache";

export const statsRouter = Router();

const STATS_TTL          = 120_000; // 2 minutes
const CATEGORY_TTL       = 300_000; // 5 minutes
const PROTOCOLS_TTL      = 300_000; // 5 minutes

// ─── GET /api/stats ───────────────────────────────────────────────────────────

statsRouter.get("/", async (_req: Request, res: Response) => {
    const hit = cache.get<object>("stats:main");
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=120");
        res.setHeader("X-Cache", "HIT");
        return res.json(hit);
    }
    const stats = await getStats();
    cache.set("stats:main", stats, STATS_TTL);
    res.setHeader("Cache-Control", "public, max-age=120");
    res.setHeader("X-Cache", "MISS");
    return res.json(stats);
});

// ─── GET /api/stats/protocols ─────────────────────────────────────────────────

statsRouter.get("/protocols", async (_req: Request, res: Response) => {
    const hit = cache.get<object>("stats:protocols");
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=300");
        res.setHeader("X-Cache", "HIT");
        return res.json(hit);
    }
    const protocols = await getProtocols();
    const body = { data: protocols };
    cache.set("stats:protocols", body, PROTOCOLS_TTL);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Cache", "MISS");
    return res.json(body);
});

// ─── GET /api/stats/counts-crosstab ──────────────────────────────────────────
// Returns the pre-computed CrossTabCounts[categoryKey][statusKey] matrix.
// Populated by the SeaportPoller tick; 503 until the first tick completes.

statsRouter.get("/counts-crosstab", (_req: Request, res: Response) => {
    const crosstab = cache.get<CrossTabCounts>(CROSSTAB_CACHE_KEY);
    if (!crosstab) {
        return res.status(503).json({ error: "Cross-tab counts not yet computed — try again shortly" });
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Cache", "HIT");
    return res.json(crosstab);
});

// ─── GET /api/stats/category-counts ──────────────────────────────────────────

statsRouter.get("/category-counts", async (_req: Request, res: Response) => {
    const hit = cache.get<object>("stats:category-counts");
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=300");
        res.setHeader("X-Cache", "HIT");
        return res.json(hit);
    }
    const counts = await getCategoryCounts();
    cache.set("stats:category-counts", counts, CATEGORY_TTL);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Cache", "MISS");
    return res.json(counts);
});

// ─── GET /api/stats/states ────────────────────────────────────────────────────
// Returns distinct US states present in the Fabrica asset catalogue.

const StatesQuerySchema = z.object({});

statsRouter.get("/states", async (_req: Request, res: Response) => {
    const hit = cache.get<string[]>("stats:states");
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=600");
        res.setHeader("X-Cache", "HIT");
        return res.json({ data: hit });
    }
    const states = await getPropertyStates();
    cache.set("stats:states", states, 600_000);
    res.setHeader("Cache-Control", "public, max-age=600");
    res.setHeader("X-Cache", "MISS");
    return res.json({ data: states });
});

// ─── GET /api/stats/counties ──────────────────────────────────────────────────
// Returns distinct counties. Optional ?state= filter.

statsRouter.get("/counties", async (req: Request, res: Response) => {
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const cacheKey = `stats:counties:${state ?? ""}`;
    const hit = cache.get<string[]>(cacheKey);
    if (hit) {
        res.setHeader("Cache-Control", "public, max-age=600");
        res.setHeader("X-Cache", "HIT");
        return res.json({ data: hit });
    }
    const counties = await getPropertyCounties(state);
    cache.set(cacheKey, counties, 600_000);
    res.setHeader("Cache-Control", "public, max-age=600");
    res.setHeader("X-Cache", "MISS");
    return res.json({ data: counties });
});
