import { API_BASE_URL } from "@/config/api";
import type {
  Asset,
  AssetFilters,
  Listing,
  MarketStats,
  Paginated,
  ProtocolInfo,
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

// ─── Assets ──────────────────────────────────────────────────────────────────

export function fetchAssets(filters: AssetFilters = {}): Promise<Paginated<Asset>> {
  return get("/api/assets", filters as Record<string, string | number>);
}

export function fetchAsset(id: string): Promise<Asset> {
  return get(`/api/assets/${encodeURIComponent(id)}`);
}

export function fetchAssetHistory(id: string): Promise<{ data: unknown[] }> {
  return get(`/api/assets/${encodeURIComponent(id)}/history`);
}

// ─── Listings ────────────────────────────────────────────────────────────────

export function fetchListings(params?: {
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Listing>> {
  return get("/api/listings", params as Record<string, string | number>);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function fetchStats(): Promise<MarketStats> {
  return get("/api/stats");
}

export function fetchProtocols(): Promise<{ data: ProtocolInfo[] }> {
  return get("/api/stats/protocols");
}
