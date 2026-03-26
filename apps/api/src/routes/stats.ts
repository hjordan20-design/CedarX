import { Router, type Request, type Response } from "express";
import { getStats, getProtocols, getCategoryCounts } from "../db/queries";

export const statsRouter = Router();

// ─── GET /api/stats ───────────────────────────────────────────────────────────

statsRouter.get("/", async (_req: Request, res: Response) => {
    const stats = await getStats();
    return res.json(stats);
});

// ─── GET /api/stats/protocols ─────────────────────────────────────────────────

statsRouter.get("/protocols", async (_req: Request, res: Response) => {
    const protocols = await getProtocols();
    return res.json({ data: protocols });
});

// ─── GET /api/stats/category-counts ──────────────────────────────────────────

statsRouter.get("/category-counts", async (_req: Request, res: Response) => {
    const counts = await getCategoryCounts();
    return res.json(counts);
});
