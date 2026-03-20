import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAsset, getAssets, getAssetHistory, type AssetFilters } from "../db/queries";

export const assetsRouter = Router();

// ─── GET /api/assets ─────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
    category: z.enum(["land", "fixed-income", "rental-property"]).optional(),
    protocol: z.enum(["fabrica", "ondo", "realt"]).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    sort: z.enum(["price_asc", "price_desc", "newest", "volume"]).optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

assetsRouter.get("/", async (req: Request, res: Response) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }

    const filters: AssetFilters = parsed.data;
    const result = await getAssets(filters);

    return res.json({
        data: result.data.map(formatAsset),
        pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            hasMore: result.hasMore,
        },
    });
});

// ─── GET /api/assets/:id ─────────────────────────────────────────────────────

assetsRouter.get("/:id", async (req: Request, res: Response) => {
    const asset = await getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    return res.json(formatAsset(asset));
});

// ─── GET /api/assets/:id/history ─────────────────────────────────────────────

assetsRouter.get("/:id/history", async (req: Request, res: Response) => {
    const asset = await getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const history = await getAssetHistory(req.params.id, limit);
    return res.json({ data: history });
});

// ─── Formatter ────────────────────────────────────────────────────────────────

// Maps DB column_names → camelCase for the API response,
// matching the CedarXAsset interface the spec defines.
function formatAsset(row: any) {
    return {
        id: row.id,
        protocol: row.protocol,
        contractAddress: row.contract_address,
        tokenId: row.token_id ?? undefined,
        tokenStandard: row.token_standard,
        chain: row.chain,
        name: row.name,
        description: row.description ?? undefined,
        category: row.category,
        imageUrl: row.image_url ?? undefined,
        details: row.details ?? {},
        lastSalePrice: row.last_sale_price ?? undefined,
        currentListingPrice: row.current_listing_price ?? undefined,
        totalVolume: row.total_volume ?? 0,
        externalUrl: row.external_url ?? undefined,
        lastUpdated: row.last_updated,
    };
}
