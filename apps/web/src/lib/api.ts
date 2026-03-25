import { API_BASE_URL } from "@/config/api";
import type {
  Asset,
  AssetFilters,
  Listing,
  MarketStats,
  Paginated,
  ProtocolInfo,
  SeaportOrder,
  SeaportOrderParameters,
} from "./types";

async function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
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
  return get("/api/assets", filters as Record<string, string | number | boolean>);
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

// ─── Seaport ─────────────────────────────────────────────────────────────────

export function fetchSeaportOrder(assetId: string): Promise<SeaportOrder> {
  return get(`/api/seaport/orders/${encodeURIComponent(assetId)}`);
}

export interface CreateSeaportListingParams {
  assetId: string;
  chain: "ethereum" | "polygon";
  sellerAddress: string;
  price: string;
  paymentToken: string;
  paymentTokenSymbol: string;
  paymentTokenDecimals: number;
  expiration?: string;
  orderParameters: {
    parameters: Record<string, unknown>;
    signature: string;
  };
}

export async function postSeaportListing(
  params: CreateSeaportListingParams
): Promise<{ orderHash: string; openSeaError: string | null }> {
  const res = await fetch(`${API_BASE_URL}/api/seaport/listings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: /api/seaport/listings`);
  return res.json();
}

export interface SeaportFulfillmentData {
  /** Seaport contract address to send the tx to */
  to: string;
  /**
   * Address the buyer must approve for ERC-20 spending (the Seaport conduit,
   * or the Seaport contract itself when fulfillerConduitKey is zero).
   */
  approvalTarget: string;
  /** ABI-encoded calldata; pass directly to sendTransaction */
  data: string;
  /** Native ETH value in wei as a decimal string; "0" for ERC-20 orders */
  value: string;
  /** ERC-20 token the buyer pays; zero address for native ETH orders */
  token: string;
  /** ERC-20 amount in token base units as a decimal string */
  amount: string;
}

export async function fetchSeaportFulfillment(params: {
  orderHash:    string;
  chain:        "ethereum" | "polygon";
  buyerAddress: string;
}): Promise<SeaportFulfillmentData> {
  const res = await fetch(`${API_BASE_URL}/api/seaport/fulfill`, {
    method:  "POST",
    headers: { "content-type": "application/json" },
    body:    JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(
      (body.error as string | undefined) ??
      `Fulfillment API error ${res.status}`
    );
  }
  return res.json() as Promise<SeaportFulfillmentData>;
}

// ─── Seaport offers ──────────────────────────────────────────────────────────

export interface CreateSeaportOfferParams {
  assetId: string;
  chain: "ethereum" | "polygon";
  offererAddress: string;
  amount: string;             // raw USDC base units as string
  paymentToken: string;       // token contract address
  paymentTokenSymbol: string;
  paymentTokenDecimals: number;
  durationSeconds: number;
  expiresAt: string;          // ISO timestamp
  orderParameters: {
    parameters: Record<string, unknown>;
    signature: string;
  };
}

export async function postSeaportOffer(
  params: CreateSeaportOfferParams
): Promise<{ orderHash: string | null; openSeaError: string | null }> {
  const res = await fetch(`${API_BASE_URL}/api/seaport/offers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: /api/seaport/offers`);
  return res.json();
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function fetchStats(): Promise<MarketStats> {
  return get("/api/stats");
}

export function fetchProtocols(): Promise<{ data: ProtocolInfo[] }> {
  return get("/api/stats/protocols");
}
