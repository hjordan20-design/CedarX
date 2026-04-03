import { Hono } from "hono";
import { z } from "zod";
import { getActiveListings, insertListing, updateListing } from "../db/queries.js";

const app = new Hono();

// ─── GET /listings ──────────────────────────────────────────────────────────

app.get("/", async (c) => {
    const listings = await getActiveListings();
    return c.json({ data: listings });
});

// ─── POST /listings ─────────────────────────────────────────────────────────

const CreateListingSchema = z.object({
    key_id: z.string().uuid(),
    seller_wallet: z.string().min(1),
    asking_price_usdc: z.number().positive(),
    status: z.enum(["active", "sold", "cancelled"]).default("active"),
});

app.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = CreateListingSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const listing = await insertListing(parsed.data);
    return c.json({ data: listing }, 201);
});

// ─── PATCH /listings/:id ────────────────────────────────────────────────────

const UpdateListingSchema = z.object({
    asking_price_usdc: z.number().positive().optional(),
    status: z.enum(["active", "sold", "cancelled"]).optional(),
    sold_at: z.string().nullable().optional(),
});

app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateListingSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const listing = await updateListing(id, parsed.data);
    return c.json({ data: listing });
});

export default app;
