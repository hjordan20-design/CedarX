import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAsset, getAssets, getAssetHistory, getSeaportPriceMap, getTrendingAssets, type AssetFilters } from "../db/queries";

export const assetsRouter = Router();

// ─── GET /api/assets ─────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
    category:         z.enum(["real-estate", "luxury-goods", "art", "collectibles", "watches", "digital-passports"]).optional(),
    protocol:         z.enum(["fabrica", "4k", "courtyard", "arianee"]).optional(),
    chain:            z.enum(["ethereum", "polygon"]).optional(),
    minPrice:         z.coerce.number().nonnegative().optional(),
    maxPrice:         z.coerce.number().nonnegative().optional(),
    sort:             z.enum(["price_asc", "price_desc", "newest", "volume"]).optional(),
    search:           z.string().max(100).optional(),
    // Three-way listing filter (preferred)
    listingFilter:    z.enum(["listed", "unlisted", "all"]).optional(),
    // Legacy boolean flag — kept for backward compat; mapped to listingFilter below
    listedOnly:       z.coerce.boolean().optional(),
    // Also accept ?has_active_listing=true (exact column filter)
    has_active_listing: z.coerce.boolean().optional(),
    page:             z.coerce.number().int().positive().default(1),
    limit:            z.coerce.number().int().positive().max(200).default(20),
});

assetsRouter.get("/", async (req: Request, res: Response) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }

    // Resolve effective listingFilter:
    //   1. Explicit ?listingFilter=listed|unlisted|all takes highest priority
    //   2. Legacy ?listedOnly=false or ?has_active_listing=false → "all"
    //   3. Legacy ?listedOnly=true or ?has_active_listing=true  → "listed"
    //   4. Default → "listed" (marketplace shows buyable assets first)
    let listingFilter = parsed.data.listingFilter;
    if (!listingFilter) {
        const legacyOff = parsed.data.listedOnly === false || parsed.data.has_active_listing === false;
        const legacyOn  = parsed.data.listedOnly === true  || parsed.data.has_active_listing === true;
        listingFilter   = legacyOff ? "all" : legacyOn ? "listed" : "listed";
    }

    const filters: AssetFilters = {
        ...parsed.data,
        listingFilter,
    };
    const result = await getAssets(filters);

    // For assets that have an active listing but no price synced yet, fall back to
    // the cheapest active Seaport order price fetched in one batch query.
    const needsPrice = result.data
        .filter(r => r.has_active_listing && r.current_listing_price == null)
        .map(r => r.id);
    const seaportPrices = await getSeaportPriceMap(needsPrice);

    return res.json({
        data: result.data.map(row => formatAsset(row, seaportPrices)),
        pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            hasMore: result.hasMore,
        },
    });
});

// ─── GET /api/assets/trending ────────────────────────────────────────────────

assetsRouter.get("/trending", async (_req: Request, res: Response) => {
    const assets = await getTrendingAssets(8);
    const seaportPrices = await getSeaportPriceMap(
        assets.filter(a => a.has_active_listing && a.current_listing_price == null).map(a => a.id)
    );
    return res.json({ data: assets.map(row => formatAsset(row, seaportPrices)) });
});

// ─── GET /api/assets/:id ─────────────────────────────────────────────────────

assetsRouter.get("/:id", async (req: Request, res: Response) => {
    const asset = await getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    const seaportPrices = (asset.has_active_listing && asset.current_listing_price == null)
        ? await getSeaportPriceMap([asset.id])
        : undefined;
    return res.json(formatAsset(asset, seaportPrices));
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
type SeaportPriceMap = Map<string, { price: string; symbol: string; decimals: number }>;

function formatAsset(row: any, seaportPrices?: SeaportPriceMap) {
    // Supabase can return PostgreSQL `numeric` columns as strings; always coerce
    // to number explicitly so the field is never silently dropped or mistyped.
    let currentListingPrice: number | undefined;
    if (row.current_listing_price != null) {
        const n = Number(row.current_listing_price);
        if (!isNaN(n)) currentListingPrice = n;
    }
    let currentListingPaymentTokenSymbol: string | undefined =
        row.current_listing_payment_token_symbol ?? undefined;

    // Seaport-order fallback: covers assets whose sync job hasn't run yet.
    if (currentListingPrice == null && seaportPrices) {
        const sp = seaportPrices.get(row.id);
        if (sp) {
            currentListingPrice = Number(sp.price) / Math.pow(10, sp.decimals);
            currentListingPaymentTokenSymbol = sp.symbol;
        }
    }

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
        currentListingPrice,
        currentListingPaymentTokenSymbol,
        hasActiveListing: row.has_active_listing ?? false,
        totalVolume: row.total_volume ?? 0,
        externalUrl: row.external_url ?? undefined,
        lastUpdated: row.last_updated,
    };
}
