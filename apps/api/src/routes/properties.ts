import { Hono } from "hono";
import { z } from "zod";
import {
    getProperties,
    getPropertyWithKeys,
    insertProperty,
    updateProperty,
    getCheapestKeyPrice,
    getAvailableKeyCount,
} from "../db/queries.js";

const app = new Hono();

// ─── GET /properties ────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
    city: z.string().optional(),
    beds: z.coerce.number().int().positive().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
});

app.get("/", async (c) => {
    const parsed = ListQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
        return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
    }

    const properties = await getProperties(parsed.data);

    // Enrich with pricing and availability
    const enriched = await Promise.all(
        properties.map(async (p) => {
            const [cheapestPrice, availableKeys] = await Promise.all([
                getCheapestKeyPrice(p.id),
                getAvailableKeyCount(p.id),
            ]);
            return {
                ...p,
                keys_from_usdc: cheapestPrice,
                available_keys: availableKeys,
            };
        })
    );

    // Apply price filters client-side (keys are in a separate table)
    let result = enriched;
    if (parsed.data.minPrice != null) {
        result = result.filter((p) => p.keys_from_usdc != null && p.keys_from_usdc >= parsed.data.minPrice!);
    }
    if (parsed.data.maxPrice != null) {
        result = result.filter((p) => p.keys_from_usdc != null && p.keys_from_usdc <= parsed.data.maxPrice!);
    }

    return c.json({ data: result });
});

// ─── GET /properties/:id ────────────────────────────────────────────────────

app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await getPropertyWithKeys(id);
    if (!result) {
        return c.json({ error: "Property not found" }, 404);
    }
    return c.json({ data: result });
});

// ─── POST /properties ───────────────────────────────────────────────────────

const CreatePropertySchema = z.object({
    building_name: z.string().min(1),
    neighborhood: z.string().optional(),
    city: z.string().min(1),
    state: z.string().default("FL"),
    beds: z.number().int().positive(),
    baths: z.number().int().positive(),
    sqft: z.number().int().positive(),
    floor: z.number().int().optional(),
    description: z.string().optional(),
    amenities: z.array(z.unknown()).default([]),
    photos: z.array(z.string()).default([]),
    landlord_wallet: z.string().optional(),
    pm_id: z.string().uuid().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
});

app.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = CreatePropertySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const property = await insertProperty(parsed.data);
    return c.json({ data: property }, 201);
});

// ─── PATCH /properties/:id ──────────────────────────────────────────────────

const UpdatePropertySchema = CreatePropertySchema.partial();

app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdatePropertySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const property = await updateProperty(id, parsed.data);
    return c.json({ data: property });
});

export default app;
