/**
 * POST /api/tokenize-request
 *
 * Accepts a user's request to tokenize a land parcel via Fabrica.
 * Stores the request in the tokenize_requests Supabase table.
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getDb } from "../db/client";

export const tokenizeRouter = Router();

const TokenizeRequestSchema = z.object({
    address: z.string().min(1).max(500),
    state:   z.string().min(1).max(100),
    county:  z.string().min(1).max(100).optional(),
    email:   z.string().email().max(200),
    notes:   z.string().max(2000).optional(),
});

tokenizeRouter.post("/", async (req: Request, res: Response) => {
    const parsed = TokenizeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const db = getDb();
    const { error } = await db.from("tokenize_requests").insert({
        address: parsed.data.address,
        state:   parsed.data.state,
        county:  parsed.data.county ?? null,
        email:   parsed.data.email,
        notes:   parsed.data.notes ?? null,
    });

    if (error) {
        // If the table doesn't exist yet, return a graceful error rather than crashing.
        if (error.code === "42P01") {
            console.warn("[tokenize] tokenize_requests table not found — returning 503");
            return res.status(503).json({ error: "Service temporarily unavailable. Please email us at hello@cedarx.io." });
        }
        console.error("[tokenize] insert error:", error);
        return res.status(500).json({ error: "Failed to save your request. Please try again." });
    }

    return res.status(201).json({ ok: true });
});
