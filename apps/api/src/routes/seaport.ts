/**
 * Seaport order routes.
 *
 * GET  /api/seaport/orders/:assetId  — fetch the active Seaport order for an asset
 * POST /api/seaport/listings         — accept a signed order from the seller, store it
 *                                      and post it to OpenSea
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
    getActiveSeaportOrder,
    upsertSeaportOrder,
    syncAssetSeaportListing,
} from "../db/queries";
import {
    OPENSEA_API_KEY,
    OPENSEA_API_BASE_URL,
    CEDARX_FEE_WALLET,
} from "../config";
import type { SeaportOrderInsert } from "../db/types";

export const seaportRouter = Router();

// ─── GET /api/seaport/orders/:assetId ─────────────────────────────────────────

seaportRouter.get("/orders/:assetId", async (req: Request, res: Response) => {
    const order = await getActiveSeaportOrder(req.params.assetId);
    if (!order) return res.status(404).json({ error: "No active Seaport order" });
    return res.json(formatOrder(order));
});

// ─── POST /api/seaport/listings ───────────────────────────────────────────────
// Receives a signed Seaport order from the frontend (seller listing flow).
// Stores the order locally and forwards it to OpenSea.

const CreateListingSchema = z.object({
    assetId:              z.string(),
    chain:                z.enum(["ethereum", "polygon"]),
    sellerAddress:        z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    price:                z.string(),              // raw units as string
    paymentToken:         z.string(),              // payment token address
    paymentTokenSymbol:   z.string(),
    paymentTokenDecimals: z.number().int().min(0).max(18),
    expiration:           z.string().optional(),   // ISO timestamp
    orderParameters:      z.object({
        parameters: z.record(z.unknown()),
        signature:  z.string(),
    }),
});

seaportRouter.post("/listings", async (req: Request, res: Response) => {
    const parsed = CreateListingSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const d = parsed.data;

    // Derive order_hash from OpenSea if available; otherwise use a local placeholder
    // (OpenSea's API returns the canonical hash after submission)
    let orderHash = `cedarx-${Date.now()}-${d.sellerAddress.slice(2, 8)}`;

    // Post to OpenSea API (best-effort; we store locally regardless)
    const openSeaChain = d.chain === "polygon" ? "matic" : "ethereum";
    let openSeaError: string | null = null;

    if (OPENSEA_API_KEY) {
        try {
            const osRes = await fetch(
                `${OPENSEA_API_BASE_URL}/api/v2/orders/${openSeaChain}/seaport/listings`,
                {
                    method: "POST",
                    headers: {
                        "x-api-key":   OPENSEA_API_KEY,
                        "content-type": "application/json",
                        accept:        "application/json",
                    },
                    body: JSON.stringify({
                        parameters: d.orderParameters.parameters,
                        signature:  d.orderParameters.signature,
                    }),
                }
            );
            if (osRes.ok) {
                const body = await osRes.json() as { order?: { order_hash?: string } };
                if (body?.order?.order_hash) orderHash = body.order.order_hash;
            } else {
                openSeaError = `OpenSea responded ${osRes.status}: ${await osRes.text()}`;
                console.warn("[seaport] OpenSea post failed:", openSeaError);
            }
        } catch (err) {
            openSeaError = err instanceof Error ? err.message : String(err);
            console.warn("[seaport] OpenSea post error:", openSeaError);
        }
    }

    const insert: SeaportOrderInsert = {
        order_hash:             orderHash,
        asset_id:               d.assetId,
        chain:                  d.chain,
        seller_address:         d.sellerAddress.toLowerCase(),
        price:                  d.price,
        payment_token:          d.paymentToken.toLowerCase(),
        payment_token_symbol:   d.paymentTokenSymbol,
        payment_token_decimals: d.paymentTokenDecimals,
        price_usd:              null,
        expiration:             d.expiration ?? null,
        order_parameters:       d.orderParameters as SeaportOrderInsert["order_parameters"],
        source:                 "cedarx",
        status:                 "active",
    };

    await upsertSeaportOrder(insert);

    // Sync asset listing state immediately so it shows up in the UI
    const cheapest = await getActiveSeaportOrder(d.assetId);
    await syncAssetSeaportListing(d.assetId, cheapest);

    return res.status(201).json({
        orderHash,
        openSeaError,
        feeWallet: CEDARX_FEE_WALLET || null,
    });
});

// ─── Formatter ────────────────────────────────────────────────────────────────

function formatOrder(row: ReturnType<typeof Object.assign>) {
    return {
        orderHash:             row.order_hash,
        assetId:               row.asset_id,
        chain:                 row.chain,
        sellerAddress:         row.seller_address,
        price:                 row.price,
        paymentToken:          row.payment_token,
        paymentTokenSymbol:    row.payment_token_symbol,
        paymentTokenDecimals:  row.payment_token_decimals,
        priceUsd:              row.price_usd,
        expiration:            row.expiration,
        orderParameters:       row.order_parameters,
        source:                row.source,
        status:                row.status,
    };
}
