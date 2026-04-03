/**
 * Query helpers for the RelayX marketplace API.
 */

import { getDb } from "./client.js";
import type {
    PropertyRow,
    PropertyInsert,
    KeyRow,
    KeyInsert,
    ListingRow,
    ListingInsert,
    RedemptionRow,
    RedemptionInsert,
    PointInsert,
} from "./types.js";

// ─── Properties ─────────────────────────────────────────────────────────────

export interface PropertyFilters {
    city?: string;
    beds?: number;
    minPrice?: number;
    maxPrice?: number;
}

export async function getProperties(filters: PropertyFilters = {}): Promise<PropertyRow[]> {
    const db = getDb();
    let query = db.from("properties").select("*").eq("status", "active");

    if (filters.city) query = query.ilike("city", filters.city);
    if (filters.beds != null) query = query.gte("beds", filters.beds);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as PropertyRow[];
}

export async function getPropertyWithKeys(id: string): Promise<{ property: PropertyRow; keys: KeyRow[] } | null> {
    const db = getDb();
    const { data: property, error: pErr } = await db
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();
    if (pErr && pErr.code === "PGRST116") return null;
    if (pErr) throw pErr;

    const { data: keys, error: kErr } = await db
        .from("keys")
        .select("*")
        .eq("property_id", id)
        .in("status", ["tradeable", "active"])
        .order("start_date", { ascending: true });
    if (kErr) throw kErr;

    return { property: property as PropertyRow, keys: (keys ?? []) as KeyRow[] };
}

export async function insertProperty(property: PropertyInsert): Promise<PropertyRow> {
    const db = getDb();
    const { data, error } = await (db.from("properties") as any).insert(property).select().single();
    if (error) throw error;
    return data as PropertyRow;
}

export async function updateProperty(id: string, updates: Partial<PropertyInsert>): Promise<PropertyRow> {
    const db = getDb();
    const { data, error } = await (db.from("properties") as any).update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as PropertyRow;
}

// ─── Keys ───────────────────────────────────────────────────────────────────

export interface KeyFilters {
    property_id?: string;
    status?: string;
    owner_wallet?: string;
}

export async function getKeys(filters: KeyFilters = {}): Promise<KeyRow[]> {
    const db = getDb();
    let query = db.from("keys").select("*");

    if (filters.property_id) query = query.eq("property_id", filters.property_id);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.owner_wallet) query = query.eq("owner_wallet", filters.owner_wallet);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as KeyRow[];
}

export async function getKeyWithProperty(id: string): Promise<{ key: KeyRow; property: PropertyRow } | null> {
    const db = getDb();
    const { data, error } = await db
        .from("keys")
        .select("*, properties(*)")
        .eq("id", id)
        .single();
    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    if (!data) return null;

    const row = data as any;
    const { properties, ...key } = row;
    return { key: key as KeyRow, property: properties as PropertyRow };
}

export async function insertKeys(keys: KeyInsert[]): Promise<KeyRow[]> {
    const db = getDb();
    const { data, error } = await (db.from("keys") as any).insert(keys).select();
    if (error) throw error;
    return (data ?? []) as KeyRow[];
}

export async function updateKey(id: string, updates: Partial<KeyInsert>): Promise<KeyRow> {
    const db = getDb();
    const { data, error } = await (db.from("keys") as any).update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as KeyRow;
}

// ─── Listings ───────────────────────────────────────────────────────────────

export async function getActiveListings(): Promise<ListingRow[]> {
    const db = getDb();
    const { data, error } = await db
        .from("listings")
        .select("*, keys(*, properties(*))")
        .eq("status", "active")
        .order("listed_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ListingRow[];
}

export async function insertListing(listing: ListingInsert): Promise<ListingRow> {
    const db = getDb();
    const { data, error } = await (db.from("listings") as any).insert(listing).select().single();
    if (error) throw error;
    return data as ListingRow;
}

export async function updateListing(id: string, updates: Partial<ListingInsert>): Promise<ListingRow> {
    const db = getDb();
    const { data, error } = await (db.from("listings") as any).update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as ListingRow;
}

// ─── Redemptions ────────────────────────────────────────────────────────────

export async function insertRedemption(redemption: RedemptionInsert): Promise<RedemptionRow> {
    const db = getDb();
    const { data, error } = await (db.from("redemptions") as any).insert(redemption).select().single();
    if (error) throw error;
    return data as RedemptionRow;
}

export async function updateRedemption(id: string, updates: Partial<RedemptionInsert>): Promise<RedemptionRow> {
    const db = getDb();
    const { data, error } = await (db.from("redemptions") as any).update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as RedemptionRow;
}

// ─── Points ─────────────────────────────────────────────────────────────────

export async function getPointBalance(wallet: string): Promise<number> {
    const db = getDb();
    const { data, error } = await db
        .from("points")
        .select("amount")
        .eq("wallet", wallet) as { data: Array<{ amount: number }> | null; error: any };
    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}

export async function insertPointEvent(point: PointInsert): Promise<void> {
    const db = getDb();
    const { error } = await (db.from("points") as any).insert(point);
    if (error) throw error;
}

// ─── Property price helpers ─────────────────────────────────────────────────

export async function getCheapestKeyPrice(propertyId: string): Promise<number | null> {
    const db = getDb();
    const { data, error } = await db
        .from("keys")
        .select("price_usdc")
        .eq("property_id", propertyId)
        .eq("status", "tradeable")
        .order("price_usdc", { ascending: true })
        .limit(1)
        .maybeSingle() as { data: { price_usdc: number } | null; error: any };
    if (error) throw error;
    return data ? Number(data.price_usdc) : null;
}

export async function getAvailableKeyCount(propertyId: string): Promise<number> {
    const db = getDb();
    const { count, error } = await db
        .from("keys")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .eq("status", "tradeable");
    if (error) throw error;
    return count ?? 0;
}
