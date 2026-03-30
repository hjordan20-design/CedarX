// ─── Asset ────────────────────────────────────────────────────────────────────

export type Protocol = "fabrica" | "propy" | "roofstock" | "courtyard" | "4k" | "arianee";
export type Category = "real-estate" | "luxury-goods" | "art" | "collectibles" | "watches" | "digital-passports";
export type TokenStandard = "ERC-721" | "ERC-1155";

export interface AssetDetails {
  // Real estate (Fabrica, Propy, Roofstock onChain)
  location?: string;
  acreage?: number;
  parcel_id?: string;
  legal_description?: string;
  county?: string;
  state?: string;
  lat?: number;
  lng?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  // Luxury goods (watches, jewelry, handbags)
  brand?: string;
  model?: string;
  year?: number;
  condition?: string;
  serial?: string;
  // Art & collectibles
  artist?: string;
  medium?: string;
  dimensions?: string;
  provenance?: string;
  edition?: string;
}

export interface Asset {
  id: string;
  protocol?: Protocol;
  contractAddress: string;
  tokenId?: string;
  tokenStandard: TokenStandard;
  chain: string;
  name: string;
  description?: string;
  category: Category;
  imageUrl?: string;
  details: AssetDetails;
  lastSalePrice?: number;
  currentListingPrice?: number;
  currentListingPaymentTokenSymbol?: string;
  hasActiveListing: boolean;
  totalVolume: number;
  externalUrl?: string;
  lastUpdated: string;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export type ListingStatus = "active" | "sold" | "cancelled";

export interface Listing {
  listingId: number;
  assetId: string | null;
  seller: string;
  tokenContract: string;
  tokenId?: string;
  quantity: string;
  askingPrice: string;
  tokenStandard: TokenStandard;
  status: ListingStatus;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  asset?: {
    id: string;
    name: string;
    protocol?: Protocol;
    category: Category;
    imageUrl?: string;
    details: AssetDetails;
  };
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface MarketStats {
  totalAssets: number;
  activeListings: number;
  totalVolume: string;
  totalTrades: number;
  byProtocol: Record<string, number>;
}

export interface ProtocolInfo {
  id: Protocol;
  name: string;
  category: string;
  website: string;
  assetCount: number;
}

// ─── API responses ───────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  pagination: {
    /** null when the query is large (non-listed filter) and counting was skipped. */
    total: number | null;
    page: number;
    limit: number;
    hasMore: boolean;
    /** Cursor for the next page (created_at of last item). Only present for sort=newest. */
    nextCursor?: string;
  };
}

export interface AssetFilters {
  category?: Category;
  protocol?: Protocol;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "newest" | "volume" | "acreage_asc" | "acreage_desc";
  search?: string;
  /**
   * Three-way listing filter:
   *  "listed"   — only assets with an active listing and a price (default)
   *  "unlisted" — only assets with no active listing
   *  "all"      — show everything
   */
  listingFilter?: "listed" | "unlisted" | "all";
  page?: number;
  limit?: number;
  /**
   * Cursor for O(1) deep pagination when sort=newest.
   * Pass the `nextCursor` from the previous page's response.
   */
  cursor?: string;
  /** Land-specific filters */
  state?: string;
  county?: string;
  minAcreage?: number;
  maxAcreage?: number;
}

// ─── Seaport ─────────────────────────────────────────────────────────────────

export interface SeaportOfferItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
}

export interface SeaportConsiderationItem extends SeaportOfferItem {
  recipient: string;
}

export interface SeaportOrderParameters {
  offerer: string;
  zone: string;
  offer: SeaportOfferItem[];
  consideration: SeaportConsiderationItem[];
  orderType: number;
  startTime: string;
  endTime: string;
  zoneHash: string;
  salt: string;
  conduitKey: string;
  totalOriginalConsiderationItems: number;
}

export interface SeaportOrder {
  orderHash: string;
  assetId: string;
  chain: string;
  sellerAddress: string;
  /** Raw price in payment token's smallest unit (e.g. wei for ETH) */
  price: string;
  paymentToken: string;       // 0x000…0 = native ETH
  paymentTokenSymbol: string; // "ETH" | "WETH" | "USDC" | …
  paymentTokenDecimals: number;
  priceUsd: string | null;
  expiration: string | null;
  orderParameters: {
    parameters: SeaportOrderParameters;
    signature: string;
  } | null;
  source: "opensea" | "cedarx";
  status: "active" | "filled" | "cancelled" | "expired";
}

/** Whitelisted protocol contract addresses — used for "Verified" badge. */
export const VERIFIED_CONTRACTS: Record<string, string> = {
  "0x5cbeb7a0df7ed85d82a472fd56d81ed550f3ea95": "Fabrica",        // Ethereum
  "0xebf19415d94be89a1d692f82af391685dc1bff79": "4K Protocol",    // Ethereum
  "0x251be3a17af4892035c37ebf5890f4a4d889dcad": "Courtyard",      // Polygon
};
