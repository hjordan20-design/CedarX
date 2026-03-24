/**
 * Seaport order routes.
 *
 * GET  /api/seaport/orders/:assetId  — fetch the active Seaport order for an asset
 * POST /api/seaport/listings         — accept a signed order from the seller, store it
 *                                      and post it to OpenSea
 * POST /api/seaport/fulfill          — proxy to OpenSea fulfillment_data API; returns
 *                                      resolved parameters + signature + ETH value for
 *                                      the buyer to submit on-chain
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
    getActiveSeaportOrder,
    upsertSeaportOrder,
    syncAssetSeaportListing,
    expireSeaportOrders,
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

// ─── POST /api/seaport/fulfill ────────────────────────────────────────────────
// Proxies to OpenSea's fulfillment_data endpoint to get the resolved Seaport
// order parameters + seller signature for a given order hash + buyer address.
// OpenSea resolves any lazy/on-chain signatures server-side; we don't need to
// store the signature at all — it is fetched fresh at the moment of purchase.

const SEAPORT_PROTOCOL_ADDRESS = "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC";

interface OpenSeaFulfillmentResponse {
    fulfillment_data?: {
        transaction?: {
            value?: number | string;
        };
        orders?: Array<{
            protocol_data?: {
                parameters?: Record<string, unknown>;
                signature?: string | null;
            };
        }>;
    };
}

const FulfillRequestSchema = z.object({
    orderHash:    z.string(),
    chain:        z.enum(["ethereum", "polygon"]),
    buyerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/i),
});

seaportRouter.post("/fulfill", async (req: Request, res: Response) => {
    const parsed = FulfillRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { orderHash, chain, buyerAddress } = parsed.data;

    if (!OPENSEA_API_KEY) {
        return res.status(503).json({ error: "OpenSea API not configured on this server" });
    }

    const openSeaChain = chain === "polygon" ? "matic" : "ethereum";

    // Log the exact payload so order_hash mismatches can be diagnosed in production.
    // The hash stored in seaport_orders.order_hash must match what OpenSea's
    // fulfillment_data API expects (it comes from listing.order_hash verbatim).
    console.log(
        `[seaport/fulfill] → OpenSea fulfillment_data` +
        ` | hash=${orderHash} chain=${openSeaChain} buyer=${buyerAddress}`
    );

    const osRes = await fetch(
        `${OPENSEA_API_BASE_URL}/api/v2/listings/fulfillment_data`,
        {
            method: "POST",
            headers: {
                "x-api-key":    OPENSEA_API_KEY,
                "content-type": "application/json",
                accept:         "application/json",
            },
            body: JSON.stringify({
                listing: {
                    hash:             orderHash,
                    chain:            openSeaChain,
                    protocol_address: SEAPORT_PROTOCOL_ADDRESS,
                },
                fulfiller: { address: buyerAddress },
            }),
        }
    );

    if (!osRes.ok) {
        const text = await osRes.text();
        console.error(
            `[seaport/fulfill] OpenSea ${osRes.status} for hash=${orderHash}:`,
            text.slice(0, 400)
        );

        // 400 / 404 from OpenSea's fulfillment endpoint means the order no longer
        // exists — it was cancelled, filled, or expired since our last poll.
        // Expire it in the DB immediately so the next GET /orders/:assetId won't
        // return it, and respond with 410 Gone + a human-readable message so the
        // frontend can show it directly rather than spinning on "Processing…".
        if (osRes.status === 400 || osRes.status === 404) {
            try {
                await expireSeaportOrders([orderHash]);
                console.log(`[seaport/fulfill] expired stale order ${orderHash} in DB`);
            } catch (dbErr) {
                console.error("[seaport/fulfill] failed to expire stale order in DB:", dbErr);
            }
            return res.status(410).json({
                error:   "This listing has expired or been cancelled.",
                expired: true,
            });
        }

        return res.status(502).json({
            error:   `OpenSea fulfillment API returned ${osRes.status}`,
            details: text,
        });
    }

    const body = (await osRes.json()) as OpenSeaFulfillmentResponse;
    const protocolData = body.fulfillment_data?.orders?.[0]?.protocol_data;
    const txValue      = body.fulfillment_data?.transaction?.value;

    if (!protocolData?.parameters || !protocolData?.signature) {
        console.error(
            "[seaport/fulfill] missing protocol_data in OpenSea response:",
            JSON.stringify(body).slice(0, 400)
        );
        return res.status(502).json({
            error: "OpenSea did not return order parameters or signature in fulfillment_data",
        });
    }

    console.log(`[seaport/fulfill] ✓ resolved signature for hash=${orderHash}`);
    return res.json({
        parameters: protocolData.parameters,
        signature:  protocolData.signature,
        // ETH value in wei as a decimal string; "0" for ERC-20 orders
        value: String(txValue ?? "0"),
    });
});

// ─── Formatter ────────────────────────────────────────────────────────────────

function formatOrder(row: ReturnType<typeof Object.assign>) {
    return {
        orderHash:             row.order_hash,
        assetId:               row.asset_id,
        chain:                 row.chain,
        sellerAddress:         row.seller_address,
        // Always a string so the frontend can safely pass to Number() without
        // risk of JS float64 precision loss on large NUMERIC values (e.g. wei).
        price:                 String(row.price),
        paymentToken:          row.payment_token,
        paymentTokenSymbol:    row.payment_token_symbol,
        paymentTokenDecimals:  Number(row.payment_token_decimals),
        priceUsd:              row.price_usd,
        expiration:            row.expiration,
        orderParameters:       row.order_parameters,
        source:                row.source,
        status:                row.status,
    };
}
