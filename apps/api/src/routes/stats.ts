import { Router, type Request, type Response } from "express";
import { getStats, getProtocols } from "../db/queries";

export const statsRouter = Router();

// ─── GET /api/stats ───────────────────────────────────────────────────────────

statsRouter.get("/", async (_req: Request, res: Response) => {
    const stats = await getStats();
    return res.json(stats);
});

// ─── GET /api/protocols ───────────────────────────────────────────────────────

statsRouter.get("/protocols", async (_req: Request, res: Response) => {
    const protocols = await getProtocols();
    return res.json({ data: protocols });
});
