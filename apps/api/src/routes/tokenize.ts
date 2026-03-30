/**
 * POST /api/tokenize-request
 *
 * Stores a user's land tokenization request in the tokenization_requests table.
 *
 * -- SQL to create the table (run once in Supabase SQL editor):
 * CREATE TABLE IF NOT EXISTS tokenization_requests (
 *   id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   address           TEXT        NOT NULL,
 *   city              TEXT,
 *   state             TEXT        NOT NULL,
 *   county            TEXT,
 *   parcel_id         TEXT,
 *   legal_description TEXT,
 *   acreage           NUMERIC,
 *   asking_price      NUMERIC,
 *   owner_wallet      TEXT,
 *   email             TEXT        NOT NULL,
 *   notes             TEXT,
 *   status            TEXT        NOT NULL DEFAULT 'pending',
 *   created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getDb } from "../db/client";

export const tokenizeRouter = Router();

const TokenizeRequestSchema = z.object({
    address:      z.string().min(1).max(500),
    city:         z.string().max(200).optional(),
    state:        z.string().min(1).max(100),
    county:       z.string().max(100).optional(),
    parcel_id:         z.string().max(100).optional(),
    legal_description: z.string().max(5000).optional(),
    acreage:           z.coerce.number().positive().optional(),
    asking_price: z.coerce.number().positive().optional(),
    owner_wallet: z.string().max(200).optional(),
    email:        z.string().email().max(200),
    notes:        z.string().max(2000).optional(),
});

tokenizeRouter.post("/", async (req: Request, res: Response) => {
    const parsed = TokenizeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const db = getDb();
    const d = parsed.data;
    const { error } = await db.from("tokenization_requests").insert({
        address:      d.address,
        city:         d.city         ?? null,
        state:        d.state,
        county:       d.county       ?? null,
        parcel_id:         d.parcel_id         ?? null,
        legal_description: d.legal_description ?? null,
        acreage:           d.acreage           ?? null,
        asking_price: d.asking_price ?? null,
        owner_wallet: d.owner_wallet ?? null,
        email:        d.email,
        notes:        d.notes        ?? null,
        status:       "pending",
    });

    if (error) {
        if (error.code === "42P01") {
            console.warn("[tokenize] tokenization_requests table not found — returning 503");
            return res.status(503).json({ error: "Service temporarily unavailable. Please email us at hello@cedarx.io." });
        }
        console.error("[tokenize] insert error:", error);
        return res.status(500).json({ error: "Failed to save your request. Please try again." });
    }

    return res.status(201).json({ ok: true });
});
