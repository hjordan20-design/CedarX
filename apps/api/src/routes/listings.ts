import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getListings, type ListingFilters } from "../db/queries";

export const listingsRouter = Router();

// ─── GET /api/listings ────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
    category: z.enum(["land", "fixed-income", "rental-property"]).optional(),
    sort: z.enum(["price_asc", "price_desc", "newest"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

listingsRouter.get("/", async (req: Request, res: Response) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }

    const filters: ListingFilters = parsed.data;
    const result = await getListings(filters);

    return res.json({
        data: result.data.map(formatListing),
        pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            hasMore: result.hasMore,
        },
    });
});

// ─── Formatter ────────────────────────────────────────────────────────────────

function formatListing(row: any) {
    return {
        listingId: row.listing_id,
        assetId: row.asset_id,
        seller: row.seller,
        tokenContract: row.token_contract,
        tokenId: row.token_id ?? undefined,
        quantity: row.quantity,
        askingPrice: row.asking_price,
        tokenStandard: row.token_standard,
        status: row.status,
        txHash: row.tx_hash,
        blockNumber: row.block_number,
        createdAt: row.created_at,
        // Joined asset data (if the JOIN returned it)
        asset: row.assets ? {
            id: row.assets.id,
            name: row.assets.name,
            protocol: row.assets.protocol,
            category: row.assets.category,
            imageUrl: row.assets.image_url ?? undefined,
            details: row.assets.details ?? {},
        } : undefined,
    };
}
