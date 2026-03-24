/**
 * SeaportPoller — listing-first asset discovery.
 *
 * Strategy
 * --------
 * Instead of querying which assets we've already indexed, this poller queries
 * OpenSea for ALL active Seaport listings on each whitelisted contract. For
 * every listing found:
 *
 *   1. Derive a deterministic asset ID from the contract config + token ID.
 *   2. If the asset isn't in our DB yet, fetch its metadata from the OpenSea
 *      NFT API and auto-create the asset row (lazy discovery).
 *   3. Upsert the Seaport order into seaport_orders.
 *   4. After processing all contracts, expire stored active orders that OpenSea
 *      no longer returns (filled / cancelled / expired on-chain).
 *   5. Sync has_active_listing and current_listing_price on every touched asset.
 *
 * The Transfer event pollers (Fabrica, 4K, Courtyard) continue running to
 * catch new mints and transfers, but only tokens with active listings appear on
 * the CedarX marketplace.
 *
 * Rate limiting
 * -------------
 * OpenSea free tier: ~2 req/s.  We sleep DELAY_MS between every API call and
 * back off 5 s on 429 responses.
 */

import {
    OPENSEA_API_KEY,
    OPENSEA_API_BASE_URL,
    SEAPORT_POLL_INTERVAL_MS,
    FABRICA_TOKEN_V2,
    FOURTK_CONTRACT,
    COURTYARD_CONTRACT,
    ARIANEE_CONTRACT,
} from "../config";
import {
    getAsset,
    upsertAsset,
    getAllActiveSeaportOrders,
    upsertSeaportOrder,
    expireSeaportOrders,
    syncAssetSeaportListing,
    getActiveSeaportOrder,
    getAssetsWithActiveListing,
    getActiveOrdersWithNullSignature,
    patchOrderSignature,
} from "../db/queries";
import type { AssetDetails, AssetInsert, SeaportOrderInsert } from "../db/types";
import { resolveImageUrl } from "../lib/ipfs";

// ─── Constants ────────────────────────────────────────────────────────────────

const DELAY_MS = 600; // ms between OpenSea API requests (~1.7 req/s)

// ─── Contract registry ────────────────────────────────────────────────────────

type Protocol = "fabrica" | "4k" | "courtyard" | "arianee";

interface ContractConfig {
    chain: string;
    openSeaChain: string; // OpenSea chain slug ("matic" for Polygon)
    openSeaSlug: string;  // OpenSea collection slug for /listings/collection/{slug}/all
    contractAddress: string;
    protocol: Protocol;
    tokenStandard: "ERC-721" | "ERC-1155";
    chainId: number;
}

/** Build the list of whitelisted contracts to poll from env-provided addresses. */
function buildContracts(): ContractConfig[] {
    const contracts: ContractConfig[] = [];

    if (FABRICA_TOKEN_V2) {
        contracts.push({
            chain: "ethereum",
            openSeaChain: "ethereum",
            openSeaSlug: "fabrica-land",
            contractAddress: FABRICA_TOKEN_V2.toLowerCase(),
            protocol: "fabrica",
            tokenStandard: "ERC-1155",
            chainId: 1,
        });
    }

    if (FOURTK_CONTRACT) {
        contracts.push({
            chain: "ethereum",
            openSeaChain: "ethereum",
            openSeaSlug: "4kprotocol",
            contractAddress: FOURTK_CONTRACT.toLowerCase(),
            protocol: "4k",
            tokenStandard: "ERC-1155",
            chainId: 1,
        });
    }

    if (COURTYARD_CONTRACT) {
        contracts.push({
            chain: "polygon",
            openSeaChain: "matic",
            openSeaSlug: "courtyard-nft",
            contractAddress: COURTYARD_CONTRACT.toLowerCase(),
            protocol: "courtyard",
            tokenStandard: "ERC-721",
            chainId: 137,
        });
    }

    if (ARIANEE_CONTRACT) {
        // Shared Arianee Protocol contract used by all Arianee member brands
        // including Breitling, Panerai, Moncler, IWC, Lacoste, Yves Saint Laurent,
        // and Audemars Piguet. All DPPs are minted on a single ERC-721 contract.
        //
        // Verified via OpenSea:
        //   Primary slug: opensea.io/collection/arianee
        //   Alternate slug: opensea.io/collection/arianee-smart-asset
        //   Contract on Polygon: 0xc14cc4d89116ec88ebb63fdf497aace6ff3745da
        //   Confirmed: Moncler items visible at opensea.io/assets/matic/{contract}/{tokenId}
        //
        // Note: "arianee-smart-asset" is an alternate OpenSea collection slug for
        // the same contract. We poll "arianee" (primary slug) to avoid duplicates.
        contracts.push({
            chain: "polygon",
            openSeaChain: "matic",
            openSeaSlug: "arianee",
            contractAddress: ARIANEE_CONTRACT.toLowerCase(),
            protocol: "arianee",
            tokenStandard: "ERC-721",
            chainId: 137,
        });
    }

    return contracts;
}

// ─── OpenSea API response shapes ─────────────────────────────────────────────
// Endpoint: GET /api/v2/listings/collection/{slug}/all

interface OpenSeaOrderParameters {
    offerer: string;
    zone: string;
    offer: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
    }>;
    consideration: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
        recipient: string;
    }>;
    orderType: number;
    startTime: string;
    endTime: string;   // Unix timestamp (seconds) as string
    zoneHash: string;
    salt: string;
    conduitKey: string;
    totalOriginalConsiderationItems: number;
    counter: number;
}

interface OpenSeaListing {
    order_hash: string;
    chain: string;
    type: string;
    price: {
        current: {
            currency: string;  // "ETH", "USDC", etc.
            decimals: number;
            value: string;     // raw amount in currency base units
        };
    };
    protocol_data: {
        parameters: OpenSeaOrderParameters;
        // OpenSea's collection-listings endpoint occasionally returns null here
        // (on-chain orders, lazily-signed listings, etc.).  We backfill via the
        // orders endpoint in backfillMissingSignatures().
        signature: string | null;
    };
    protocol_address: string;
}

interface OpenSeaCollectionListingsResponse {
    listings: OpenSeaListing[];
    next: string | null;
}

// Endpoint: GET /api/v2/orders/{chain}/seaport/listings?order_hash={hash}
// This endpoint reliably includes the seller signature.
interface OpenSeaOrdersResponse {
    orders: Array<{
        protocol_data: {
            parameters: OpenSeaOrderParameters;
            signature: string | null;
        };
    }>;
    next: string | null;
}

interface OpenSeaNFTTrait {
    trait_type: string;
    display_type: string | null;
    max_value: string | null;
    value: string | number;
}

interface OpenSeaNFT {
    identifier: string;
    collection: string;
    contract: string;
    token_standard: string;
    name: string | null;
    description: string | null;
    image_url: string | null;
    display_image_url: string | null;
    metadata_url: string | null;
    traits: OpenSeaNFTTrait[];
    owners?: Array<{ address: string; quantity: number }>;
}

interface OpenSeaNFTResponse {
    nft: OpenSeaNFT;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the deterministic CedarX asset ID for a token. */
function buildAssetId(config: ContractConfig, tokenId: string): string {
    return `${config.protocol}:${config.chainId}:${config.contractAddress}:${tokenId}`;
}

/**
 * Normalize an OpenSea NFT API response into an AssetInsert row.
 * Uses the same field mappings as the per-protocol normalizers.
 */
function normalizeOpenSeaNFT(nft: OpenSeaNFT, config: ContractConfig): AssetInsert {
    const tokenId = nft.identifier;
    const id = buildAssetId(config, tokenId);

    const attr = (key: string): string | number | undefined =>
        nft.traits.find((t) => t.trait_type.toLowerCase() === key.toLowerCase())?.value;

    // Resolve IPFS image URIs to public HTTP URLs
    const rawImage = nft.display_image_url ?? nft.image_url ?? null;
    const imageUrl = rawImage ? resolveImageUrl(rawImage) : null;

    let category: AssetInsert["category"];
    let details: AssetDetails;
    let externalUrl: string;

    switch (config.protocol) {
        case "fabrica":
            category = "real-estate";
            details = {
                location:  attr("location") as string | undefined,
                acreage:   attr("acreage")  as number | undefined,
                parcel_id: attr("parcel number") as string | undefined,
                county:    attr("county")   as string | undefined,
                state:     attr("state")    as string | undefined,
            };
            externalUrl = `https://fabrica.land/token/${tokenId}`;
            break;

        case "4k":
            category = "luxury-goods";
            details = {
                brand:     attr("brand")         as string | undefined,
                model:     attr("model")         as string | undefined,
                year:      attr("year")          as number | undefined,
                condition: attr("condition")     as string | undefined,
                serial:    attr("serial number") as string | undefined,
            };
            externalUrl = `https://www.4k.com/nft/${tokenId}`;
            break;

        case "arianee":
            category = "luxury-goods";
            details = {
                brand:     (attr("brand") ?? attr("Brand")) as string | undefined,
                model:     (attr("model") ?? attr("Model")) as string | undefined,
                serial:    (attr("serial") ?? attr("Serial Number")) as string | undefined,
                condition: attr("condition") as string | undefined,
            };
            externalUrl = `https://arianee.net/polygon/${config.contractAddress}/${tokenId}`;
            break;

        case "courtyard":
        default: {
            const categoryAttr = ((attr("type") ?? attr("category") ?? "") as string).toLowerCase();
            category = categoryAttr.includes("art") ? "art" : "collectibles";
            details = {
                brand:      attr("brand")      as string | undefined,
                series:     attr("series")     as string | undefined,
                edition:    attr("set")        as string | undefined,
                condition:  (attr("condition") ?? attr("grade")) as string | undefined,
                grade:      attr("grade")      as string | undefined,
                provenance: attr("year") ? `${attr("year")}` : undefined,
            };
            // courtyard.io/token/{contract}/{id} returns 404 — remove until
            // the correct URL format is confirmed.
            externalUrl = "";
            break;
        }
    }

    return {
        id,
        protocol: config.protocol,
        contract_address: config.contractAddress,
        token_id: tokenId,
        token_standard: config.tokenStandard,
        chain: config.chain,
        name: nft.name ?? `${config.protocol} #${tokenId}`,
        description: nft.description ?? null,
        category,
        image_url: imageUrl,
        external_url: externalUrl,
        details,
        has_active_listing: false, // set correctly by syncAssetSeaportListing
        last_sale_price: null,
        current_listing_price: null,
        total_volume: 0,
        last_updated: new Date().toISOString(),
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── SeaportPoller ────────────────────────────────────────────────────────────

export class SeaportPoller {
    private timer: ReturnType<typeof setInterval> | null = null;
    private running = false;

    start(): void {
        if (this.running) return;
        this.running = true;
        this.log("starting (listing-first discovery)");
        void this.tick();
        this.timer = setInterval(() => void this.tick(), SEAPORT_POLL_INTERVAL_MS);
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.running = false;
        this.log("stopped");
    }

    // ── Main tick ─────────────────────────────────────────────────────────────

    private async tick(): Promise<void> {
        if (!OPENSEA_API_KEY) {
            this.log("OPENSEA_API_KEY not set — skipping");
            return;
        }

        const contracts = buildContracts();
        if (!contracts.length) {
            this.log("no whitelisted contracts configured — skipping");
            return;
        }

        // Load all active orders from DB once up-front so each contract can
        // immediately expire its stale orders without a second DB round-trip.
        const allActive = await getAllActiveSeaportOrders();
        this.log(`tick start — ${allActive.length} active order(s) in DB`);

        const freshlySeen    = new Set<string>(); // accumulates across all contracts this tick
        const affectedAssets = new Set<string>(); // asset IDs that need has_active_listing sync
        let totalExpired     = 0;

        try {
            for (const contract of contracts) {
                try {
                    await this.processContract(contract, freshlySeen, affectedAssets);

                    // Expire stale orders for THIS contract immediately after its
                    // listings are fully paginated — don't wait for other contracts.
                    // Match by asset_id prefix: "<protocol>:<chainId>:<contractAddress>:"
                    const prefix = `${contract.protocol}:${contract.chainId}:${contract.contractAddress}:`;
                    const stale = allActive.filter(
                        (o) => o.asset_id?.startsWith(prefix) && !freshlySeen.has(o.order_hash)
                    );
                    if (stale.length) {
                        await expireSeaportOrders(stale.map((o) => o.order_hash));
                        for (const o of stale) if (o.asset_id) affectedAssets.add(o.asset_id);
                        totalExpired += stale.length;
                        this.log(
                            `[${contract.protocol}] expired ${stale.length} stale order(s): ` +
                            stale.slice(0, 5).map((o) => o.order_hash.slice(0, 10) + "…").join(", ") +
                            (stale.length > 5 ? ` +${stale.length - 5} more` : "")
                        );
                    } else {
                        this.log(`[${contract.protocol}] all active orders confirmed live`);
                    }
                } catch (err) {
                    this.logError(`contract ${contract.contractAddress} failed`, err);
                }
            }

            // Full sweep: sync every asset touched this tick PLUS every asset
            // still flagged has_active_listing=true in the DB (catches stragglers
            // whose orders were expired in a prior tick without clearing the flag).
            const stillFlagged = await getAssetsWithActiveListing();
            for (const id of stillFlagged) affectedAssets.add(id);

            let syncCount = 0;
            for (const assetId of affectedAssets) {
                try {
                    const cheapest = await getActiveSeaportOrder(assetId);
                    await syncAssetSeaportListing(assetId, cheapest);
                    syncCount++;
                } catch (err) {
                    this.logError(`sync failed for ${assetId}`, err);
                }
            }

            this.log(
                `tick complete — ${freshlySeen.size} live listing(s), ` +
                `${totalExpired} expired this tick, ${syncCount} asset(s) synced`
            );

            // Backfill any active orders whose signature is still null.
            await this.backfillMissingSignatures();
        } catch (err) {
            this.logError("tick failed", err);
        }
    }

    // ── Process one contract: fetch all listings, auto-create missing assets ──

    private async processContract(
        contract: ContractConfig,
        freshlySeen: Set<string>,
        affectedAssets: Set<string>
    ): Promise<void> {
        this.log(`fetching listings for ${contract.protocol} (slug: ${contract.openSeaSlug})`);

        const listings = await this.fetchAllListings(contract.openSeaSlug);
        this.log(`${contract.protocol}: ${listings.length} active listing(s)`);

        for (const listing of listings) {
            const params = listing.protocol_data?.parameters;
            const offer  = params?.offer?.[0];
            if (!offer || !params) continue;

            const tokenId = offer.identifierOrCriteria;
            const assetId = buildAssetId(contract, tokenId);

            // Auto-create asset row if it hasn't been indexed yet
            const existing = await getAsset(assetId);
            if (!existing) {
                await this.autoCreateAsset(contract, tokenId, assetId);
                await sleep(DELAY_MS); // rate limit metadata fetch
            }

            // Derive payment token from the price block and consideration items.
            // The first ERC-20 consideration item (itemType === 1) carries the token address.
            // If all consideration items are NATIVE (itemType === 0) it's an ETH listing.
            const priceBlock = listing.price?.current;
            const paymentTokenSymbol   = priceBlock?.currency ?? "ETH";
            const rawDecimals          = priceBlock?.decimals;
            const paymentTokenDecimals = (rawDecimals != null && rawDecimals > 0)
                ? rawDecimals
                : (paymentTokenSymbol === "USDC" || paymentTokenSymbol === "USDT" || paymentTokenSymbol === "DAI") ? 6 : 18;
            const rawPrice             = priceBlock?.value ?? "0";

            const erc20Consideration = params.consideration.find((c) => c.itemType === 1);
            const paymentTokenAddress = erc20Consideration
                ? erc20Consideration.token.toLowerCase()
                : "0x0000000000000000000000000000000000000000";

            // endTime is a Unix timestamp (seconds); convert to ISO for storage
            const endTimeMs = Number(params.endTime) * 1000;
            const expiration = endTimeMs > 0 ? new Date(endTimeMs).toISOString() : null;

            const insert: SeaportOrderInsert = {
                order_hash:             listing.order_hash,
                asset_id:               assetId,
                chain:                  contract.chain,
                seller_address:         params.offerer.toLowerCase(),
                price:                  rawPrice,
                payment_token:          paymentTokenAddress,
                payment_token_symbol:   paymentTokenSymbol,
                payment_token_decimals: paymentTokenDecimals,
                price_usd:              null, // not provided by this endpoint
                expiration,
                order_parameters: {
                    parameters:       params,
                    signature:        listing.protocol_data.signature,
                    // Store the exact Seaport contract address from the listing
                    // so the fulfill route can pass the right protocol_address
                    // to OpenSea's fulfillment_data API (1.5 vs 1.6 differ).
                    protocol_address: listing.protocol_address,
                },
                source: "opensea",
                status: "active",
            };

            await upsertSeaportOrder(insert);
            freshlySeen.add(listing.order_hash);
            affectedAssets.add(assetId);
        }
    }

    // ── Paginate through all active listings for a collection slug ───────────

    private async fetchAllListings(slug: string): Promise<OpenSeaListing[]> {
        const allListings: OpenSeaListing[] = [];
        let cursor: string | null = null;

        do {
            const url = new URL(
                `${OPENSEA_API_BASE_URL}/api/v2/listings/collection/${slug}/all`
            );
            url.searchParams.set("limit", "100");
            if (cursor) url.searchParams.set("next", cursor);

            this.log(`GET ${url.toString()}`);

            const res = await fetch(url.toString(), {
                headers: { "X-API-KEY": OPENSEA_API_KEY, "accept": "application/json" },
            });

            const rawText = await res.text();
            this.log(`response ${res.status} — ${rawText.slice(0, 200)}`);

            if (res.status === 429) {
                this.log("rate limit hit — backing off 5s");
                await sleep(5000);
                break;
            }
            if (!res.ok) {
                this.logError(`OpenSea listings API ${res.status} for slug=${slug}`, rawText);
                break;
            }

            const body = JSON.parse(rawText) as OpenSeaCollectionListingsResponse;
            allListings.push(...(body.listings ?? []));
            cursor = body.next ?? null;

            if (cursor) await sleep(DELAY_MS);
        } while (cursor);

        return allListings;
    }

    // ── Fetch OpenSea metadata and auto-create an asset row ───────────────────

    private async autoCreateAsset(
        contract: ContractConfig,
        tokenId: string,
        assetId: string
    ): Promise<void> {
        try {
            const url = `${OPENSEA_API_BASE_URL}/api/v2/chain/${contract.openSeaChain}/contract/${contract.contractAddress}/nfts/${tokenId}`;
            const res = await fetch(url, {
                headers: { "X-API-KEY": OPENSEA_API_KEY, "accept": "application/json" },
            });

            if (res.status === 429) {
                this.log(`rate limit fetching metadata for ${assetId} — skipping`);
                await sleep(5000);
                return;
            }
            if (!res.ok) {
                this.logError(`metadata API ${res.status} for ${assetId}`, await res.text());
                return;
            }

            const body = (await res.json()) as OpenSeaNFTResponse;
            if (!body.nft) return;

            const assetRow = normalizeOpenSeaNFT(body.nft, contract);
            await upsertAsset(assetRow);
            this.log(`auto-created ${assetId} (${assetRow.name})`);
        } catch (err) {
            this.logError(`auto-create failed for ${assetId}`, err);
        }
    }

    // ── Backfill null signatures via the OpenSea orders endpoint ─────────────
    //
    // The collection-listings endpoint (/listings/collection/{slug}/all) can
    // return null for protocol_data.signature on certain listing types.  The
    // per-order endpoint (/orders/{chain}/seaport/listings?order_hash=…) always
    // returns the real seller signature, so we use it to patch any gaps.

    private async backfillMissingSignatures(): Promise<void> {
        const orders = await getActiveOrdersWithNullSignature();
        if (!orders.length) return;

        this.log(`backfilling signatures for ${orders.length} order(s)`);
        let patched = 0;

        for (const order of orders) {
            try {
                // Map CedarX chain name → OpenSea chain slug
                const openSeaChain = order.chain === "polygon" ? "matic" : order.chain;
                const url = new URL(
                    `${OPENSEA_API_BASE_URL}/api/v2/orders/${openSeaChain}/seaport/listings`
                );
                url.searchParams.set("order_hash", order.order_hash);

                this.log(`GET ${url.toString()}`);
                const res = await fetch(url.toString(), {
                    headers: { "X-API-KEY": OPENSEA_API_KEY, "accept": "application/json" },
                });

                if (res.status === 429) {
                    this.log("rate limit during signature backfill — stopping early");
                    await sleep(5000);
                    break;
                }
                if (!res.ok) {
                    this.logError(`orders API ${res.status} for ${order.order_hash}`, await res.text());
                    await sleep(DELAY_MS);
                    continue;
                }

                const body = (await res.json()) as OpenSeaOrdersResponse;
                const sig = body.orders?.[0]?.protocol_data?.signature;

                if (sig && sig !== "0x") {
                    await patchOrderSignature(order.order_hash, sig);
                    this.log(`patched signature for ${order.order_hash}`);
                    patched++;
                } else {
                    this.log(`no signature available yet for ${order.order_hash}`);
                }

                await sleep(DELAY_MS);
            } catch (err) {
                this.logError(`signature backfill failed for ${order.order_hash}`, err);
            }
        }

        this.log(`signature backfill complete — ${patched}/${orders.length} patched`);
    }

    // ── Logging ───────────────────────────────────────────────────────────────

    private log(msg: string): void {
        console.log(`[seaport] ${msg}`);
    }

    private logError(msg: string, err: unknown): void {
        console.error(`[seaport] ${msg}:`, err instanceof Error ? err.message : err);
    }
}
