import { Router, type Request, type Response } from "express";
import { getStats, getProtocols, getCategoryCounts } from "../db/queries";
import { cache } from "../lib/cache";

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
