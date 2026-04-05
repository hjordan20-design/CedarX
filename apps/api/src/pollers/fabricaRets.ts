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
    ListingKey: string;
    ListPrice: number;
    // Top-level flat fields (some feed versions)
    FullStreetAddress?: unknown;
    StreetAddress?: unknown;
    City?: unknown;
    UnparsedAddress?: unknown;
    StateOrProvince?: unknown;
    State?: unknown;
    CountyOrParish?: unknown;
    County?: unknown;
    Latitude?: unknown;
    Longitude?: unknown;
    LotSizeAcres?: unknown;
    LotSizeSquareFeet?: unknown;
    ParcelNumber?: unknown;
    PublicRemarks?: unknown;
    LegalDescription?: unknown;
    // Nested block fields (Fabrica RETS feed structure)
    Address?: unknown;   // object: { FullStreetAddress, City, StateOrProvince, CountyOrParish, ... }
    Location?: unknown;  // object: { Latitude, Longitude }
    Parcels?: unknown;   // object: { Parcel: { ParcelNumber, LegalDescription, ... } }
    Media?: unknown;
    [key: string]: unknown;
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
 * Safely coerce any RETS XML field value to a trimmed string.
 * Handles string, number, boolean, and objects with "#text" (fast-xml-parser
 * wraps text content in "#text" when an element has XML attributes).
 * Returns "" for null/undefined so callers can use || chains safely.
 */
function toStr(v: unknown): string {
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v).trim();
    if (typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (o["#text"] != null) return toStr(o["#text"]);
        if (o["_text"] != null) return toStr(o["_text"]);
        if (o["text"]  != null) return toStr(o["text"]);
    }
    return "";
}

/**
 * Safely read a field from a nested object that may itself be any type.
 * e.g. nested(listing.Address, "FullStreetAddress")
 * Returns "" if the parent is not an object or the key is missing.
 */
function nested(parent: unknown, key: string): string {
    if (parent == null || typeof parent !== "object") return "";
    return toStr((parent as Record<string, unknown>)[key]);
}

/**
 * Build a human-readable property name from RETS address fields.
 *
 * Fabrica's feed uses a namespaced <Address> block:
 *   commons:FullStreetAddress, commons:City, commons:StateOrProvince
 * County lives in <Location> (not Address):
 *   listing.Location.County
 * Try all known variants so the code survives future feed changes.
 */
function buildPropertyName(listing: RetsListing): string {
    const addr = listing.Address;
    const loc  = listing.Location;

    const street = (
        nested(addr, "commons:FullStreetAddress") ||
        nested(addr, "FullStreetAddress")         ||
        nested(addr, "StreetAddress")             ||
        toStr(listing.FullStreetAddress)          ||
        toStr(listing.StreetAddress)
    );
    const city = (
        nested(addr, "commons:City") ||
        nested(addr, "City")         ||
        toStr(listing.City)
    );
    const state = (
        nested(addr, "commons:StateOrProvince") ||
        nested(addr, "StateOrProvince")         ||
        nested(addr, "State")                   ||
        toStr(listing.StateOrProvince)          ||
        toStr(listing.State)
    );
    const county = (
        nested(loc,  "County")         ||
        nested(addr, "CountyOrParish") ||
        nested(addr, "County")         ||
        toStr(listing.CountyOrParish)  ||
        toStr(listing.County)
    );

    const base = (() => {
        if (street && city && state) return `${street}, ${city}, ${state}`;
        if (street && state)         return `${street}, ${state}`;

        const unparsed = (
            nested(addr, "commons:UnparsedAddress") ||
            nested(addr, "UnparsedAddress")         ||
            toStr(listing.UnparsedAddress)
        );
        if (unparsed && !/^#?\d{10,}/.test(unparsed)) return unparsed;

        if (county && state) return `Land in ${county}, ${state}`;
        if (state)           return `Land in ${state}`;
        return "Land Parcel";
    })();

    // Append acreage so duplicate addresses become visually distinct on cards.
    // e.g. "588 Roby Fulk Rd, Pinnacle, NC · 10.2 acres"
    const acresRaw = (
        nested(listing.Parcels != null && typeof listing.Parcels === "object"
            ? (listing.Parcels as Record<string, unknown>)["Parcel"] : undefined, "LotSizeAcres") ||
        toStr(listing.LotSizeAcres) ||
        toStr((listing as Record<string, unknown>)["LotSize"])
    );
    if (acresRaw) {
        const acres = Number(acresRaw);
        if (isFinite(acres) && acres > 0) {
            const formatted = acres.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `${base} · ${formatted} acres`;
        }
    }
    return base;
}

/** Extract the first usable photo URL from a listing's Media field. */
function extractFirstPhoto(listing: RetsListing): string | null {
    if (!listing.Media) return null;
    const mediaArr = Array.isArray(listing.Media) ? listing.Media : [listing.Media];
    for (const m of mediaArr) {
        const obj = m as Record<string, unknown> | null | undefined;
        const url = obj?.MediaURL;
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
                await this.upsertListing(listing, tokenId, synced);
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

    private async upsertListing(
        listing: RetsListing,
        tokenId: string,
        debugIdx: number
    ): Promise<void> {
        const assetId = buildAssetId(tokenId);

        // Debug: for the first listing dump top-level keys + the keys of every
        // nested object block so we can see the exact XML structure.
        if (debugIdx === 0) {
            this.log(`DEBUG listing #1 top-level keys: ${Object.keys(listing).join(", ")}`);
            for (const key of ["Address", "Location", "Parcels", "Media"]) {
                const val = listing[key];
                if (val != null && typeof val === "object" && !Array.isArray(val)) {
                    this.log(`DEBUG listing #1 ${key} keys: ${Object.keys(val as object).join(", ")}`);
                    // Also dump one level deeper for Parcels (often has a Parcel sub-object)
                    for (const [sk, sv] of Object.entries(val as Record<string, unknown>)) {
                        if (sv != null && typeof sv === "object" && !Array.isArray(sv)) {
                            this.log(`DEBUG listing #1 ${key}.${sk} keys: ${Object.keys(sv as object).join(", ")}`);
                        }
                    }
                }
            }
        }

        // ── Nested block helpers ───────────────────────────────────────────────
        // Fabrica RETS feed groups fields into <Address>, <Location>, <Parcels>
        // blocks. Check those first, then fall back to top-level flat fields.
        const addr    = listing.Address  as Record<string, unknown> | undefined;
        const loc     = listing.Location as Record<string, unknown> | undefined;
        // Parcels can be { Parcel: {...} } or { Parcel: [{...}] }
        const parcels = listing.Parcels  as Record<string, unknown> | undefined;
        const parcelObj = parcels?.Parcel != null
            ? (Array.isArray(parcels.Parcel) ? parcels.Parcel[0] : parcels.Parcel) as Record<string, unknown>
            : undefined;

        // ── Image ──────────────────────────────────────────────────────────────
        const photoUrl = extractFirstPhoto(listing);
        const imageUrl = photoUrl ?? null;

        // ── Coordinates ────────────────────────────────────────────────────────
        const latRaw = nested(loc, "Latitude")  || toStr(listing.Latitude);
        const lngRaw = nested(loc, "Longitude") || toStr(listing.Longitude);
        const lat = latRaw ? Number(latRaw) : undefined;
        const lng = lngRaw ? Number(lngRaw) : undefined;

        // ── Acreage ────────────────────────────────────────────────────────────
        // Check every known location the feed might put the lot size.
        // Debug logs showed top-level LotSize=76.16, so try that first.
        let acreage: number | undefined;
        const acresRaw = (
            toStr((listing as Record<string, unknown>)["LotSize"])        ||  // top-level (confirmed in debug)
            nested(parcelObj as unknown, "LotSizeAcres")                  ||
            nested(parcelObj as unknown, "LotSize")                       ||
            nested(addr as unknown, "LotSizeAcres")                       ||
            toStr(listing.LotSizeAcres)
        );
        const sqftRaw = (
            nested(parcelObj as unknown, "LotSizeSquareFeet")             ||
            nested(addr as unknown, "LotSizeSquareFeet")                  ||
            toStr(listing.LotSizeSquareFeet)
        );
        if (acresRaw) {
            acreage = Number(acresRaw);
        } else if (sqftRaw) {
            acreage = Number(sqftRaw) / 43560;
        }
        if (acreage != null && !isFinite(acreage)) acreage = undefined;

        // ── String detail fields ───────────────────────────────────────────────
        // County is in Location block; address fields use commons: namespace.
        const county = (
            nested(loc,  "County")                          ||
            nested(addr, "CountyOrParish")                  ||
            nested(addr, "County")                          ||
            toStr(listing.CountyOrParish)                   ||
            toStr(listing.County)                           || undefined
        );
        const state = (
            nested(addr, "commons:StateOrProvince")         ||
            nested(addr, "StateOrProvince")                 ||
            nested(addr, "State")                           ||
            toStr(listing.StateOrProvince)                  ||
            toStr(listing.State)                            || undefined
        );
        const parcelId = (
            nested(parcelObj as unknown, "ParcelNumber")    ||
            nested(addr, "ParcelNumber")                    ||
            toStr(listing.ParcelNumber)                     || undefined
        );
        const legalDesc = (
            nested(parcelObj as unknown, "LegalDescription")||
            nested(addr, "LegalDescription")                ||
            toStr(listing.LegalDescription)                 || undefined
        );
        const location = (
            nested(addr, "commons:UnparsedAddress")         ||
            nested(addr, "UnparsedAddress")                 ||
            toStr(listing.UnparsedAddress)                  || undefined
        );
        const remarks = toStr(listing.PublicRemarks) || undefined;

        // Build name — store null instead of the generic "Land Parcel" fallback so
        // that resolveCardTitle on the frontend can fall through to county+state.
        const builtName = buildPropertyName(listing);
        const resolvedName = builtName === "Land Parcel" ? null : builtName;

        this.log(`DEBUG upsert token=${tokenId} name=${JSON.stringify(resolvedName)} county="${county ?? "—"}" state="${state ?? "—"}" acreage=${acreage ?? "—"} lat=${lat ?? "—"} lng=${lng ?? "—"} image=${imageUrl ?? "null"}`);

        const asset: AssetInsert = {
            id: assetId,
            protocol: "fabrica",
            contract_address: FABRICA_CONTRACT,
            token_id: tokenId,
            token_standard: "ERC-1155",
            chain: "ethereum",
            name: resolvedName,
            description: remarks ?? null,
            category: "real-estate",
            image_url: imageUrl,
            details: {
                location,
                acreage,
                county,
                state,
                parcel_id:         parcelId,
                legal_description: legalDesc,
                lat:               isFinite(lat ?? NaN) ? lat : undefined,
                lng:               isFinite(lng ?? NaN) ? lng : undefined,
            },
            has_active_listing: true,
            current_listing_price: Number(listing.ListPrice),
            current_listing_payment_token_symbol: "USDC",
            last_sale_price: null,
            total_volume: 0,
            external_url: `https://fabrica.land/token/${FABRICA_CONTRACT}/${tokenId}`,
            last_updated: new Date().toISOString(),
        };

        // clearImage: true forces removal of the old Fabrica CDN dark-overlay URL
        // even if it was previously stored; the card falls through to Mapbox sat.
        try {
            await upsertAsset(asset, { clearImage: true });
        } catch (err: unknown) {
            // Log the full Supabase/DB error so we can see the exact column/constraint
            const msg   = err instanceof Error ? err.message : String(err);
            const code  = (err as Record<string, unknown>)?.code;
            const detail= (err as Record<string, unknown>)?.details;
            const hint  = (err as Record<string, unknown>)?.hint;
            this.log(`UPSERT ERROR token=${tokenId}: ${msg} | code=${code} | detail=${detail} | hint=${hint}`);
            throw err;
        }
    }

    // ── Logging ────────────────────────────────────────────────────────────────

    private log(msg: string): void {
        console.log(`[${this.pollerId}] ${msg}`);
    }

    private logError(msg: string, err: unknown): void {
        console.error(`[${this.pollerId}] ${msg}:`, err instanceof Error ? err.message : err);
    }
}
