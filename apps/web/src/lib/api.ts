import { API_BASE_URL } from "@/config/api";
import type {
  Property,
  PropertyFilters,
  Key,
  Listing,
  Redemption,
  PointBalance,
  Paginated,
} from "./types";

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) url.searchParams.set(key, String(val));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Properties ─────────────────────────────────────────────────────────────

export function fetchProperties(filters: PropertyFilters = {}): Promise<Paginated<Property>> {
  return get("/properties", filters as Record<string, string | number>);
}

export function fetchProperty(id: string): Promise<Property & { keys: Key[] }> {
  return get(`/properties/${encodeURIComponent(id)}`);
}

// ─── Keys ───────────────────────────────────────────────────────────────────

export function fetchKeys(params?: {
  propertyId?: string;
  status?: string;
  ownerWallet?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Key>> {
  return get("/keys", params as Record<string, string | number>);
}

export function fetchKey(id: string): Promise<Key> {
  return get(`/keys/${encodeURIComponent(id)}`);
}

export function updateKey(id: string, data: Partial<Key>): Promise<Key> {
  return patch(`/keys/${encodeURIComponent(id)}`, data);
}

// ─── Listings (Secondary Market) ────────────────────────────────────────────

export function fetchListings(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Listing>> {
  return get("/listings", params as Record<string, string | number>);
}

export function createListing(data: {
  keyId: string;
  sellerWallet: string;
  askingPriceUsdc: number;
}): Promise<Listing> {
  return post("/listings", data);
}

export function updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
  return patch(`/listings/${encodeURIComponent(id)}`, data);
}

// ─── Redemptions ────────────────────────────────────────────────────────────

export function createRedemption(data: {
  keyId: string;
  wallet: string;
}): Promise<Redemption> {
  return post("/redemptions", data);
}

export function updateRedemption(id: string, data: Partial<Redemption>): Promise<Redemption> {
  return patch(`/redemptions/${encodeURIComponent(id)}`, data);
}

// ─── Points ─────────────────────────────────────────────────────────────────

export function fetchPoints(wallet: string): Promise<PointBalance> {
  return get(`/points/${encodeURIComponent(wallet)}`);
}
