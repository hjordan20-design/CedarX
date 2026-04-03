import { Hono } from "hono";
import { z } from "zod";
import { getKeys, getKeyWithProperty, insertKeys, updateKey } from "../db/queries.js";

const app = new Hono();

// ─── GET /keys ──────────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
    property_id: z.string().uuid().optional(),
    status: z.enum(["tradeable", "redeemed", "active", "expired"]).optional(),
    owner_wallet: z.string().optional(),
});

app.get("/", async (c) => {
    const parsed = ListQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
        return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
    }
    const keys = await getKeys(parsed.data);
    return c.json({ data: keys });
});

// ─── GET /keys/:id ──────────────────────────────────────────────────────────

app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await getKeyWithProperty(id);
    if (!result) {
        return c.json({ error: "Key not found" }, 404);
    }
    return c.json({ data: result });
});

// ─── POST /keys ─────────────────────────────────────────────────────────────

const CreateKeySchema = z.object({
    property_id: z.string().uuid(),
    unit: z.string().min(1),
    start_date: z.string(),
    end_date: z.string(),
    price_usdc: z.number().positive(),
    status: z.enum(["tradeable", "redeemed", "active", "expired"]).default("tradeable"),
    owner_wallet: z.string().optional(),
    token_id: z.number().int().optional(),
});

app.post("/", async (c) => {
    const body = await c.req.json();
    // Accept a single key or an array
    const items = Array.isArray(body) ? body : [body];
    const parsed = z.array(CreateKeySchema).safeParse(items);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const keys = await insertKeys(parsed.data);
    return c.json({ data: keys }, 201);
});

// ─── PATCH /keys/:id ────────────────────────────────────────────────────────

const UpdateKeySchema = z.object({
    status: z.enum(["tradeable", "redeemed", "active", "expired"]).optional(),
    owner_wallet: z.string().nullable().optional(),
    token_id: z.number().int().nullable().optional(),
    minted_at: z.string().nullable().optional(),
    redeemed_at: z.string().nullable().optional(),
    expired_at: z.string().nullable().optional(),
});

app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateKeySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const key = await updateKey(id, parsed.data);
    return c.json({ data: key });
});

export default app;
