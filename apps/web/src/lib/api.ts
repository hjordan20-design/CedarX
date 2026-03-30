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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
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

// ─── Activity (user listings + offers) ───────────────────────────────────────

export interface ActivityAsset {
  id: string;
  name: string;
  image_url: string | null;
  token_id: string | null;
  contract_address: string;
  chain: string;
}

export interface UserListing {
  orderHash: string;
  assetId: string | null;
  chain: string;
  price: string;
  paymentTokenSymbol: string;
  paymentTokenDecimals: number;
  expiration: string | null;
  status: "active" | "filled" | "cancelled" | "expired";
  createdAt: string;
  orderParameters: { parameters: Record<string, unknown>; signature: string } | null;
  asset: ActivityAsset | null;
}

export interface UserOffer {
  id: string;
  assetId: string | null;
  amount: string;
  paymentTokenSymbol: string;
  paymentTokenDecimals: number;
  expiresAt: string;
  status: "active" | "accepted" | "cancelled" | "expired";
  createdAt: string;
  orderHash: string | null;
  orderParameters: { parameters: Record<string, unknown>; signature: string } | null;
  asset: ActivityAsset | null;
}

export async function fetchUserListings(address: string): Promise<{ data: UserListing[] }> {
  return get("/api/seaport/user-listings", { address });
}

export async function fetchUserOffers(address: string): Promise<{ data: UserOffer[] }> {
  return get("/api/seaport/user-offers", { address });
}

export async function cancelUserListing(orderHash: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/seaport/cancel-listing`, {
    method:  "POST",
    headers: { "content-type": "application/json" },
    body:    JSON.stringify({ orderHash }),
  });
  if (!res.ok) throw new Error(`Cancel listing failed: ${res.status}`);
}

export async function cancelUserOffer(offerId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/seaport/cancel-offer`, {
    method:  "POST",
    headers: { "content-type": "application/json" },
    body:    JSON.stringify({ offerId }),
  });
  if (!res.ok) throw new Error(`Cancel offer failed: ${res.status}`);
}

// ─── Homepage (combined) ──────────────────────────────────────────────────────

export interface HomepageData {
  stats:    MarketStats;
  listings: Paginated<Asset>;
  trending: Asset[];
}

export function fetchHomepage(): Promise<HomepageData> {
  return get("/api/homepage");
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function fetchStats(): Promise<MarketStats> {
  return get("/api/stats");
}

export function fetchCategoryCounts(): Promise<Record<string, number>> {
  return get("/api/stats/category-counts");
}

export function fetchProtocols(): Promise<{ data: ProtocolInfo[] }> {
  return get("/api/stats/protocols");
}

export function fetchStates(): Promise<{ data: string[] }> {
  return get("/api/stats/states");
}

export function fetchCounties(state?: string): Promise<{ data: string[] }> {
  return get("/api/stats/counties", state ? { state } : undefined);
}

export interface TokenizeRequest {
  address: string;
  city?: string;
  state: string;
  county?: string;
  parcel_id?: string;
  acreage?: number;
  asking_price?: number;
  owner_wallet?: string;
  email: string;
  notes?: string;
}

export async function postTokenizeRequest(data: TokenizeRequest): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/tokenize-request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Failed to submit request.");
  }
}

// ─── Trending / price history ─────────────────────────────────────────────────

export function fetchTrendingAssets(): Promise<{ data: Asset[] }> {
  return get("/api/assets/trending");
}

export interface PriceHistoryItem {
  order_hash: string;
  price: string;
  payment_token_symbol: string;
  payment_token_decimals: number;
  status: string;
  created_at: string;
  expiration: string | null;
}

export function fetchAssetPriceHistory(assetId: string): Promise<{ data: PriceHistoryItem[] }> {
  return get(`/api/seaport/price-history/${encodeURIComponent(assetId)}`);
}
