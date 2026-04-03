import { Hono } from "hono";
import { z } from "zod";
import { getPointBalance, insertPointEvent } from "../db/queries.js";

const app = new Hono();

// ─── GET /points/:wallet ────────────────────────────────────────────────────

app.get("/:wallet", async (c) => {
    const wallet = c.req.param("wallet");
    const balance = await getPointBalance(wallet);
    return c.json({ data: { wallet, balance } });
});

// ─── POST /points ───────────────────────────────────────────────────────────

const CreatePointSchema = z.object({
    wallet: z.string().min(1),
    event_type: z.enum(["mint", "purchase", "redeem"]),
    amount: z.number().int().positive(),
});

app.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = CreatePointSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    await insertPointEvent(parsed.data);
    return c.json({ data: { success: true } }, 201);
});

export default app;
