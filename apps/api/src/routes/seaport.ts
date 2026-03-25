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
import { encodeFunctionData } from "viem";
import {
    getActiveSeaportOrder,
    upsertSeaportOrder,
    upsertSeaportOffer,
    syncAssetSeaportListing,
    expireSeaportOrders,
    backfillSeaportPrices,
} from "../db/queries";
import { getDb } from "../db/client";
import {
    OPENSEA_API_KEY,
    OPENSEA_API_BASE_URL,
    CEDARX_FEE_WALLET,
    CEDARX_FEE_BPS,
} from "../config";
import type { SeaportOrderInsert, SeaportOfferInsert } from "../db/types";
import { requireApiKey } from "../middleware/apiKey";
import { buildSeaportOrder, VALID_PAYMENT_TOKENS } from "../lib/seaportOrderBuilder";

export const seaportRouter = Router();

// ─── GET /api/seaport/orders/:assetId ─────────────────────────────────────────

seaportRouter.get("/orders/:assetId", async (req: Request, res: Response) => {
    const order = await getActiveSeaportOrder(req.params.assetId);
    if (!order) return res.status(404).json({ error: "No active Seaport order" });
    return res.json(formatOrder(order));
});

// ─── POST /api/seaport/list ───────────────────────────────────────────────────
// Agent listing step 1: build unsigned Seaport OrderComponents.
// The agent signs them with EIP-712 and submits to POST /api/seaport/listings.

const BuildOrderSchema = z.object({
    tokenContract:  z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    tokenId:        z.string(),
    tokenStandard:  z.enum(["ERC-721", "ERC-1155"]),
    chain:          z.enum(["ethereum", "polygon"]),
    price:          z.string().regex(/^\d+(\.\d+)?$/, "price must be a positive decimal number"),
    paymentToken:   z.enum(["ETH", "WETH", "USDC"]),
    duration:       z.number().int().min(1).max(365),
    sellerAddress:  z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    counter:        z.number().int().min(0),
});

seaportRouter.post("/list", requireApiKey, async (req: Request, res: Response) => {
    const parsed = BuildOrderSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const d = parsed.data;

    // Validate payment token is supported on the requested chain
    const validTokens = VALID_PAYMENT_TOKENS[d.chain] as readonly string[];
    if (!validTokens.includes(d.paymentToken)) {
        return res.status(400).json({
            error: `Payment token "${d.paymentToken}" is not supported on ${d.chain}. ` +
                   `Supported: ${validTokens.join(", ")}`,
        });
    }

    // Derive a deterministic CedarX asset ID from the on-chain identifiers.
    // Format mirrors the SeaportPoller's buildAssetId: protocol:chainId:address:tokenId
    // We use chain ID numbers (1 = ethereum, 137 = polygon).
    const chainId = d.chain === "ethereum" ? 1 : 137;
    const assetId = `cedarx:${chainId}:${d.tokenContract.toLowerCase()}:${d.tokenId}`;

    let result: ReturnType<typeof buildSeaportOrder>;
    try {
        result = buildSeaportOrder(
            {
                offerer:       d.sellerAddress,
                tokenContract: d.tokenContract,
                tokenId:       d.tokenId,
                tokenStandard: d.tokenStandard,
                chain:         d.chain,
                price:         d.price,
                paymentToken:  d.paymentToken,
                duration:      d.duration,
                feeWallet:     CEDARX_FEE_WALLET ?? "",
                feeBps:        CEDARX_FEE_BPS,
                counter:       d.counter,
            },
            assetId
        );
    } catch (err) {
        return res.status(400).json({
            error: err instanceof Error ? err.message : "Failed to build order parameters",
        });
    }

    return res.json(result);
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

seaportRouter.post("/listings", requireApiKey, async (req: Request, res: Response) => {
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
        const requestBody = {
            parameters:       d.orderParameters.parameters,
            signature:        d.orderParameters.signature,
            // protocol_address tells OpenSea which Seaport version (1.5) the order was signed against.
            // Without this, OpenSea defaults to the wrong version and rejects the order.
            protocol_address: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
        };

        console.log(
            `[seaport/listings] → OpenSea POST /api/v2/orders/${openSeaChain}/seaport/listings` +
            ` protocol_address=${requestBody.protocol_address}` +
            ` orderType=${(d.orderParameters.parameters as any)?.orderType}` +
            ` offerer=${(d.orderParameters.parameters as any)?.offerer?.slice(0, 10)}…`
        );

        try {
            const osRes = await fetch(
                `${OPENSEA_API_BASE_URL}/api/v2/orders/${openSeaChain}/seaport/listings`,
                {
                    method: "POST",
                    headers: {
                        "x-api-key":    OPENSEA_API_KEY,
                        "content-type": "application/json",
                        accept:         "application/json",
                    },
                    body: JSON.stringify(requestBody),
                }
            );
            const responseText = await osRes.text();
            if (osRes.ok) {
                const body = JSON.parse(responseText) as { order?: { order_hash?: string } };
                if (body?.order?.order_hash) orderHash = body.order.order_hash;
                console.log(`[seaport/listings] OpenSea accepted listing, order_hash=${orderHash}`);
            } else {
                openSeaError = `OpenSea responded ${osRes.status}: ${responseText}`;
                console.warn("[seaport/listings] OpenSea post failed:", openSeaError);
            }
        } catch (err) {
            openSeaError = err instanceof Error ? err.message : String(err);
            console.warn("[seaport/listings] OpenSea post error:", openSeaError);
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

const BASIC_ORDER_COMPONENTS = [
    { name: "considerationToken",                type: "address" as const },
    { name: "considerationIdentifier",           type: "uint256" as const },
    { name: "considerationAmount",               type: "uint256" as const },
    { name: "offerer",                           type: "address" as const },
    { name: "zone",                              type: "address" as const },
    { name: "offerToken",                        type: "address" as const },
    { name: "offerIdentifier",                   type: "uint256" as const },
    { name: "offerAmount",                       type: "uint256" as const },
    { name: "basicOrderType",                    type: "uint8"   as const },
    { name: "startTime",                         type: "uint256" as const },
    { name: "endTime",                           type: "uint256" as const },
    { name: "zoneHash",                          type: "bytes32" as const },
    { name: "salt",                              type: "uint256" as const },
    { name: "offererConduitKey",                 type: "bytes32" as const },
    { name: "fulfillerConduitKey",               type: "bytes32" as const },
    { name: "totalOriginalAdditionalRecipients", type: "uint256" as const },
    {
        name: "additionalRecipients",
        type: "tuple[]" as const,
        components: [
            { name: "amount",    type: "uint256"  as const },
            { name: "recipient", type: "address"  as const },
        ],
    },
    { name: "signature", type: "bytes" as const },
] as const;

// ABI for both Seaport fulfillBasicOrder variants (1.5 and 1.6 efficient).
const SEAPORT_BASIC_ORDER_ABI = [
    {
        type: "function" as const,
        name: "fulfillBasicOrder" as const,
        stateMutability: "payable" as const,
        inputs: [{ name: "parameters", type: "tuple" as const, components: BASIC_ORDER_COMPONENTS }],
        outputs: [{ name: "fulfilled", type: "bool" as const }],
    },
    {
        type: "function" as const,
        name: "fulfillBasicOrder_efficient_6GL6yc" as const,
        stateMutability: "payable" as const,
        inputs: [{ name: "parameters", type: "tuple" as const, components: BASIC_ORDER_COMPONENTS }],
        outputs: [{ name: "fulfilled", type: "bool" as const }],
    },
] as const;

/**
 * ABI-encode a BasicOrderParameters struct.
 *
 * OpenSea's fulfillment_data response returns uint256 fields as decimal
 * strings.  We must convert them to BigInt before passing to viem's
 * encodeFunctionData, otherwise they encode as 0x00…00.
 */
function encodeBasicOrderCalldata(
    fnName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: any,
): `0x${string}` {
    const functionName = (fnName === "fulfillBasicOrder_efficient_6GL6yc"
        ? "fulfillBasicOrder_efficient_6GL6yc"
        : "fulfillBasicOrder") as "fulfillBasicOrder" | "fulfillBasicOrder_efficient_6GL6yc";

    return encodeFunctionData({
        abi: SEAPORT_BASIC_ORDER_ABI,
        functionName,
        args: [{
            considerationToken:               p.considerationToken as `0x${string}`,
            considerationIdentifier:          BigInt(p.considerationIdentifier),
            considerationAmount:              BigInt(p.considerationAmount),
            offerer:                          p.offerer           as `0x${string}`,
            zone:                             p.zone              as `0x${string}`,
            offerToken:                       p.offerToken        as `0x${string}`,
            offerIdentifier:                  BigInt(p.offerIdentifier),
            offerAmount:                      BigInt(p.offerAmount),
            basicOrderType:                   Number(p.basicOrderType),
            startTime:                        BigInt(p.startTime),
            endTime:                          BigInt(p.endTime),
            zoneHash:                         p.zoneHash          as `0x${string}`,
            salt:                             BigInt(p.salt),
            offererConduitKey:                p.offererConduitKey as `0x${string}`,
            fulfillerConduitKey:              p.fulfillerConduitKey as `0x${string}`,
            totalOriginalAdditionalRecipients: BigInt(p.totalOriginalAdditionalRecipients),
            additionalRecipients:             // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p.additionalRecipients as any[]).map((r: any) => ({
                    amount:    BigInt(r.amount),
                    recipient: r.recipient as `0x${string}`,
                })),
            signature: p.signature as `0x${string}`,
        }],
    });
}

interface OpenSeaFulfillmentResponse {
    protocol?: string; // e.g. "seaport1.6"
    fulfillment_data?: {
        transaction?: {
            function?: string; // e.g. "fulfillBasicOrder_efficient_6GL6yc(...)"
            chain?: number;
            to?: string;       // Seaport contract address to call
            value?: number | string;
            input_data?: {
                parameters?: Record<string, unknown>; // BasicOrderParameters (flat struct)
            };
        };
    };
}

const FulfillRequestSchema = z.object({
    orderHash:    z.string(),
    chain:        z.enum(["ethereum", "polygon"]),
    buyerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/i),
});

seaportRouter.post("/fulfill", requireApiKey, async (req: Request, res: Response) => {
    const parsed = FulfillRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { orderHash, chain, buyerAddress } = parsed.data;

    if (!OPENSEA_API_KEY) {
        return res.status(503).json({ error: "OpenSea API not configured on this server" });
    }

    const openSeaChain = chain === "polygon" ? "matic" : "ethereum";

    // Normalise hash to lowercase — OpenSea's API is case-sensitive, and hashes
    // may arrive from the frontend with mixed capitalisation.
    const normalizedHash = orderHash.toLowerCase();

    // Look up the stored order so we can use the exact protocol_address that
    // OpenSea attached to this listing.  Different listings can be on Seaport
    // 1.5 vs 1.6; passing the wrong one returns 400 "Order not found".
    // We try both the original hash and the lowercased hash to be safe.
    const { data: orderRow } = await (getDb() as any)
        .from("seaport_orders")
        .select("order_parameters")
        .ilike("order_hash", normalizedHash)
        .maybeSingle();

    const storedProtocolAddress =
        (orderRow?.order_parameters as { protocol_address?: string } | null)
            ?.protocol_address ?? null;

    const protocolAddress: string = storedProtocolAddress ?? SEAPORT_PROTOCOL_ADDRESS;

    console.log(
        `[seaport/fulfill] protocol_address=${protocolAddress}` +
        ` (${storedProtocolAddress ? "from DB" : "fallback — order predates Fix 6 or not in DB"})`
    );

    const requestBody = {
        listing: {
            hash:             normalizedHash,
            chain:            openSeaChain,
            protocol_address: protocolAddress,
        },
        fulfiller: { address: buyerAddress },
    };

    // Log the EXACT JSON body sent to OpenSea so mismatches are immediately visible.
    console.log(
        `[seaport/fulfill] → OpenSea fulfillment_data body:`,
        JSON.stringify(requestBody)
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
            body: JSON.stringify(requestBody),
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
    const tx = body.fulfillment_data?.transaction;

    if (!tx?.to || !tx?.input_data?.parameters) {
        console.error(
            "[seaport/fulfill] missing transaction data in OpenSea response:",
            JSON.stringify(body).slice(0, 600)
        );
        return res.status(502).json({
            error: "OpenSea did not return transaction data in fulfillment_data",
        });
    }

    // Parse "fulfillBasicOrder_efficient_6GL6yc(BasicOrderParameters)" → function name only
    const rawFunctionSig = tx.function ?? "";
    const functionName = rawFunctionSig.includes("(")
        ? rawFunctionSig.slice(0, rawFunctionSig.indexOf("("))
        : "fulfillBasicOrder";

    console.log(
        `[seaport/fulfill] encoding calldata — fn=${functionName} to=${tx.to} value=${tx.value ?? 0}`
    );
    console.log(`[seaport/fulfill] input_data.parameters:`, JSON.stringify(tx.input_data.parameters));

    // Encode the calldata on the backend where we can safely convert all
    // uint256 string fields to BigInt.  The frontend will use sendTransaction
    // with the raw hex so no ABI encoding happens client-side.
    let data: `0x${string}`;
    try {
        data = encodeBasicOrderCalldata(functionName, tx.input_data.parameters);
    } catch (encErr) {
        console.error("[seaport/fulfill] calldata encoding failed:", encErr);
        return res.status(502).json({
            error: "Failed to encode Seaport calldata",
            details: encErr instanceof Error ? encErr.message : String(encErr),
        });
    }

    console.log(`[seaport/fulfill] ✓ calldata encoded (${data.length / 2 - 1} bytes) selector=${data.slice(0, 10)}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p           = tx.input_data.parameters as any;
    const seaportAddr = tx.to as `0x${string}`;

    // OpenSea's Polygon conduit — ERC-20 approvals must target this address
    const approvalTarget = "0x1E0049783F008A0085193E00003D00cd54003c71";

    // The conduit pulls the PRIMARY consideration (considerationAmount) PLUS all
    // additional-recipient amounts (platform fee, royalties, etc.) from the buyer.
    // The approval must cover the full sum — approving only considerationAmount
    // leaves the conduit short and causes an "insufficient allowance" revert.
    const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
    const token     = (p.considerationToken as string | undefined) ?? ZERO_ADDR;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const additionalSum = Array.isArray(p.additionalRecipients)
        ? (p.additionalRecipients as any[]).reduce((acc: bigint, r: any) => acc + BigInt(r.amount ?? 0), 0n)
        : 0n;
    const totalAmount = BigInt(p.considerationAmount ?? 0) + additionalSum;
    const tokenAmount = String(totalAmount);

    console.log(
        `[seaport/fulfill] ✓ to=${seaportAddr} approvalTarget=${approvalTarget}` +
        ` token=${token} considerationAmount=${p.considerationAmount} additionalSum=${additionalSum} totalAmount=${totalAmount}` +
        ` selector=${data.slice(0, 10)}`
    );

    return res.json({
        to:             seaportAddr,
        approvalTarget, // conduit or Seaport — always use this address for ERC-20 approve()
        data,
        value:          String(tx.value ?? "0"),
        token,          // ERC-20 token the buyer pays; zero address for native ETH orders
        amount:         tokenAmount,
    });
});

// ─── POST /api/seaport/offers ─────────────────────────────────────────────────
// Accepts a signed Seaport offer order from the buyer (native CedarX offer flow).
// Stores the offer in the seaport_offers table and forwards it to OpenSea so the
// NFT owner sees it on every Seaport-compatible marketplace.

const CreateOfferSchema = z.object({
    assetId:              z.string(),
    chain:                z.enum(["ethereum", "polygon"]),
    offererAddress:       z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    amount:               z.string(),              // raw USDC base units
    paymentToken:         z.string(),              // token contract address
    paymentTokenSymbol:   z.string(),
    paymentTokenDecimals: z.number().int().min(0).max(18),
    durationSeconds:      z.number().int().min(1),
    expiresAt:            z.string(),              // ISO timestamp
    orderParameters:      z.object({
        parameters: z.record(z.unknown()),
        signature:  z.string(),
    }),
});

seaportRouter.post("/offers", requireApiKey, async (req: Request, res: Response) => {
    const parsed = CreateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const d = parsed.data;
    const openSeaChain = d.chain === "polygon" ? "matic" : "ethereum";
    let orderHash: string | null = null;
    let openSeaError: string | null = null;

    // Forward to OpenSea's offers endpoint so the NFT owner sees it everywhere
    if (OPENSEA_API_KEY) {
        try {
            const osRes = await fetch(
                `${OPENSEA_API_BASE_URL}/api/v2/orders/${openSeaChain}/seaport/offers`,
                {
                    method: "POST",
                    headers: {
                        "x-api-key":    OPENSEA_API_KEY,
                        "content-type": "application/json",
                        accept:         "application/json",
                    },
                    body: JSON.stringify({
                        parameters: d.orderParameters.parameters,
                        signature:  d.orderParameters.signature,
                    }),
                }
            );
            if (osRes.ok) {
                const body = await osRes.json() as { order?: { order_hash?: string } };
                orderHash = body?.order?.order_hash ?? null;
                console.log(`[seaport/offers] OpenSea accepted offer, order_hash=${orderHash}`);
            } else {
                openSeaError = `OpenSea responded ${osRes.status}: ${await osRes.text()}`;
                console.warn("[seaport/offers] OpenSea post failed:", openSeaError);
            }
        } catch (err) {
            openSeaError = err instanceof Error ? err.message : String(err);
            console.warn("[seaport/offers] OpenSea post error:", openSeaError);
        }
    }

    // Store in CedarX database regardless of OpenSea outcome
    const insert: SeaportOfferInsert = {
        asset_id:               d.assetId,
        offerer_address:        d.offererAddress.toLowerCase(),
        amount:                 d.amount,
        payment_token:          d.paymentToken.toLowerCase(),
        payment_token_symbol:   d.paymentTokenSymbol,
        payment_token_decimals: d.paymentTokenDecimals,
        duration:               d.durationSeconds,
        order_hash:             orderHash,
        order_parameters:       d.orderParameters as SeaportOfferInsert["order_parameters"],
        status:                 "active",
        expires_at:             d.expiresAt,
    };

    await upsertSeaportOffer(insert);
    console.log(
        `[seaport/offers] stored offer asset_id=${d.assetId}` +
        ` offerer=${d.offererAddress.slice(0, 8)}… amount=${d.amount}` +
        ` order_hash=${orderHash ?? "(none)"}`
    );

    return res.status(201).json({ orderHash, openSeaError });
});

// ─── Formatter ────────────────────────────────────────────────────────────────

// ─── POST /api/seaport/admin/backfill-prices ──────────────────────────────────
// One-off admin endpoint: re-syncs current_listing_price for all assets that
// have an active Seaport order.  Corrects rows written before the decimal-
// division fix.  Requires X-CedarX-API-Key header.

seaportRouter.post("/admin/backfill-prices", requireApiKey, async (_req: Request, res: Response) => {
    try {
        const count = await backfillSeaportPrices();
        return res.json({ ok: true, updated: count });
    } catch (err) {
        console.error("[backfill-prices]", err);
        return res.status(500).json({ error: "Backfill failed", detail: String(err) });
    }
});

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
