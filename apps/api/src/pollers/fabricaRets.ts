/**
 * FabricaRetsPoller — syncs all Fabrica for-sale listings from the public
 * RETS XML syndication feed.
 *
 * Endpoint (no auth required):
 *   GET https://api3.fabrica.land/syndication/ethereum/{contract}/rets
 *
 * Strategy
 * --------
 * Every 15 minutes:
 *   1. Fetch the RETS XML feed — contains every actively listed Fabrica parcel.
 *   2. Parse each <Listing> element and upsert into the assets table:
 *        - has_active_listing = true
 *        - current_listing_price = ListPrice (already in USD/USDC)
 *        - current_listing_payment_token_symbol = "USDC"
 *        - image_url = first photo CDN URL
 *        - details.lat/lng, acreage, county, state, parcel_id, location
 *   3. Any Fabrica asset previously active but absent from this feed is
 *      delisted (has_active_listing = false, current_listing_price = null).
 *   4. Logs: "[fabrica-rets] X listings synced, Y new, Z delisted"
 *
 * This replaces Seaport/OpenSea as the source of truth for Fabrica listings.
 */

import { XMLParser } from "fast-xml-parser";
import { FABRICA_TOKEN_V2 } from "../config";
import { cache } from "../lib/cache";
import { refreshCrossTabCounts } from "../lib/countCache";
import { warmCommonQueries } from "../lib/cacheWarm";
import { upsertAsset, delistFabricaAssetsNotIn } from "../db/queries";
import type { AssetInsert } from "../db/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const RETS_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const FABRICA_CONTRACT = FABRICA_TOKEN_V2.toLowerCase();
const CHAIN_ID = 1; // Ethereum mainnet

const RETS_URL = `https://api3.fabrica.land/syndication/ethereum/${FABRICA_CONTRACT}/rets`;

/** Fabrica CDN image for a token — reliable, no IPFS needed. */
function fabricaCdnImage(tokenId: string): string {
    return `https://media3.fabrica.land/ethereum/${FABRICA_CONTRACT}/${tokenId}/image?theme=dark`;
}

/** Build the canonical CedarX asset ID for a Fabrica RETS listing. */
function buildAssetId(tokenId: string): string {
    return `fabrica:${CHAIN_ID}:${FABRICA_CONTRACT}:${tokenId}`;
}

// ─── RETS XML parsing ─────────────────────────────────────────────────────────

interface RetsListing {
    ListingKey: string;       // token ID
    ListPrice: number;        // USD price (already dollars, not cents)
    FullStreetAddress?: string; // e.g. "243 June Lane"
    City?: string;            // e.g. "Hartsel"
    UnparsedAddress?: string; // full address string (fallback)
    Latitude?: number;
    Longitude?: number;
    LotSizeAcres?: number;
    StateOrProvince?: string;
    CountyOrParish?: string;
    ParcelNumber?: string;
    PublicRemarks?: string;
    Media?: { MediaURL?: string } | Array<{ MediaURL?: string }>;
}

function parseRetsXml(xml: string): RetsListing[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        parseTagValue: true,
        isArray: (name) => name === "Listing" || name === "Media",
        allowBooleanAttributes: true,
    });

    const doc = parser.parse(xml);

    // RETS XML structure varies; look for <Listings><Listing>
    // Some feeds wrap in <RETS><Listings> or just <Listings>
    const root = doc?.RETS ?? doc;
    const listings: RetsListing[] =
        root?.Listings?.Listing ??
        root?.REData?.Listings?.Listing ??
        [];

    return Array.isArray(listings) ? listings : [listings].filter(Boolean);
}

/**
 * Build a human-readable property name from RETS address fields.
 * Preferred: "243 June Lane, Hartsel, CO"
 * Fallback:  "Land in Chaffee County, CO"
 */
function buildPropertyName(listing: RetsListing): string {
    const street = listing.FullStreetAddress?.trim();
    const city   = listing.City?.trim();
    const state  = listing.StateOrProvince?.trim();
    const county = listing.CountyOrParish?.trim();

    // Best case: street + city + state
    if (street && city && state) return `${street}, ${city}, ${state}`;
    // Street + state (no city)
    if (street && state) return `${street}, ${state}`;
    // UnparsedAddress if it contains useful info (not just a raw token ID)
    const unparsed = listing.UnparsedAddress?.trim();
    if (unparsed && !/^#?\d{10,}/.test(unparsed)) return unparsed;
    // Fallback: county + state
    if (county && state) return `Land in ${county}, ${state}`;
    if (state) return `Land in ${state}`;
    return `Land Parcel`;
}

/** Extract the first usable photo URL from a listing's Media field. */
function extractFirstPhoto(listing: RetsListing): string | null {
    if (!listing.Media) return null;
    const mediaArr = Array.isArray(listing.Media) ? listing.Media : [listing.Media];
    for (const m of mediaArr) {
        const url = m?.MediaURL;
        if (url && typeof url === "string" && url.startsWith("http")) return url;
    }
    return null;
}

// ─── FabricaRetsPoller ────────────────────────────────────────────────────────

export class FabricaRetsPoller {
    readonly pollerId = "fabrica-rets";

    private _timer: ReturnType<typeof setInterval> | null = null;
    private _running = false;

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    start(): void {
        if (this._running) return;
        this._running = true;
        this.log("starting — RETS feed polling every 15 min");

        void this._tick();
        this._timer = setInterval(() => void this._tick(), RETS_INTERVAL_MS);
    }

    stop(): void {
        if (this._timer) clearInterval(this._timer);
        this._running = false;
        this.log("stopped");
    }

    // ── Tick ───────────────────────────────────────────────────────────────────

    private async _tick(): Promise<void> {
        try {
            await this.syncFeed();
        } catch (err) {
            this.logError("tick failed", err);
        }
    }

    private async syncFeed(): Promise<void> {
        this.log("fetching RETS feed…");

        const res = await fetch(RETS_URL, {
            headers: { accept: "application/xml, text/xml, */*" },
        });

        if (!res.ok) {
            throw new Error(`RETS fetch failed: HTTP ${res.status} ${res.statusText}`);
        }

        const xml = await res.text();
        const listings = parseRetsXml(xml);

        if (listings.length === 0) {
            this.log("WARN: feed returned 0 listings — skipping delist to avoid false wipe");
            return;
        }

        this.log(`parsed ${listings.length} listings from feed`);

        let synced = 0;
        let errors = 0;
        const activeTokenIds: string[] = [];

        for (const listing of listings) {
            const tokenId = String(listing.ListingKey ?? "").trim();
            if (!tokenId) continue;

            activeTokenIds.push(tokenId);

            try {
                await this.upsertListing(listing, tokenId);
                synced++;
            } catch (err) {
                errors++;
                this.logError(`upsert failed for token ${tokenId}`, err);
            }
        }

        // Delist Fabrica assets absent from this feed
        const delisted = await delistFabricaAssetsNotIn(activeTokenIds);

        this.log(`synced=${synced} errors=${errors} delisted=${delisted}`);

        // Invalidate caches so listings appear immediately
        cache.deleteByPrefix("assets:");
        cache.deleteByPrefix("stats:");
        cache.deleteByPrefix("homepage:");
        await refreshCrossTabCounts().catch(() => {});
        await warmCommonQueries().catch(() => {});
    }

    // ── Asset upsert ───────────────────────────────────────────────────────────

    private async upsertListing(listing: RetsListing, tokenId: string): Promise<void> {
        const assetId = buildAssetId(tokenId);

        // Image: prefer feed photo, fall back to Fabrica CDN
        const photoUrl = extractFirstPhoto(listing);
        const imageUrl = photoUrl ?? fabricaCdnImage(tokenId);

        const lat = listing.Latitude  != null ? Number(listing.Latitude)  : undefined;
        const lng = listing.Longitude != null ? Number(listing.Longitude) : undefined;

        const asset: AssetInsert = {
            id: assetId,
            protocol: "fabrica",
            contract_address: FABRICA_CONTRACT,
            token_id: tokenId,
            token_standard: "ERC-1155",
            chain: "ethereum",
            name: buildPropertyName(listing),
            description: listing.PublicRemarks ?? null,
            category: "real-estate",
            image_url: imageUrl,
            details: {
                location:  listing.UnparsedAddress,
                acreage:   listing.LotSizeAcres   != null ? Number(listing.LotSizeAcres) : undefined,
                county:    listing.CountyOrParish  ?? undefined,
                state:     listing.StateOrProvince ?? undefined,
                parcel_id: listing.ParcelNumber    ?? undefined,
                lat: isFinite(lat ?? NaN) ? lat : undefined,
                lng: isFinite(lng ?? NaN) ? lng : undefined,
            },
            has_active_listing: true,
            current_listing_price: Number(listing.ListPrice),
            current_listing_payment_token_symbol: "USDC",
            last_sale_price: null,
            total_volume: 0,
            external_url: `https://fabrica.land/token/${FABRICA_CONTRACT}/${tokenId}`,
            last_updated: new Date().toISOString(),
        };

        await upsertAsset(asset);
    }

    // ── Logging ────────────────────────────────────────────────────────────────

    private log(msg: string): void {
        console.log(`[${this.pollerId}] ${msg}`);
    }

    private logError(msg: string, err: unknown): void {
        console.error(`[${this.pollerId}] ${msg}:`, err instanceof Error ? err.message : err);
    }
}
