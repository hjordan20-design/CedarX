import { Hono } from "hono";
import { z } from "zod";
import { insertRedemption, updateRedemption } from "../db/queries.js";

const app = new Hono();

// ─── POST /redemptions ──────────────────────────────────────────────────────

const CreateRedemptionSchema = z.object({
    key_id: z.string().uuid(),
    wallet: z.string().min(1),
    screening_status: z.enum(["pending", "approved", "denied"]).default("pending"),
    deposit_amount_usdc: z.number().nonnegative().optional(),
    deposit_status: z.enum(["held", "released", "claimed"]).default("held"),
    move_in_date: z.string().optional(),
    move_out_date: z.string().optional(),
});

app.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = CreateRedemptionSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const redemption = await insertRedemption(parsed.data);
    return c.json({ data: redemption }, 201);
});

// ─── PATCH /redemptions/:id ─────────────────────────────────────────────────

const UpdateRedemptionSchema = z.object({
    screening_status: z.enum(["pending", "approved", "denied"]).optional(),
    deposit_amount_usdc: z.number().nonnegative().nullable().optional(),
    deposit_status: z.enum(["held", "released", "claimed"]).nullable().optional(),
    move_in_date: z.string().nullable().optional(),
    move_out_date: z.string().nullable().optional(),
});

app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateRedemptionSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const redemption = await updateRedemption(id, parsed.data);
    return c.json({ data: redemption });
});

export default app;
