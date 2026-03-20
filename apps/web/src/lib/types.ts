// ─── Asset ────────────────────────────────────────────────────────────────────

export type Protocol = "fabrica" | "ondo" | "realt";
export type Category = "land" | "fixed-income" | "rental-property";
export type TokenStandard = "ERC-721" | "ERC-1155" | "ERC-20";

export interface AssetDetails {
  // Land (Fabrica)
  location?: string;
  acreage?: number;
  parcel_id?: string;
  county?: string;
  state?: string;
  lat?: number;
  lng?: number;
  // Fixed Income (Ondo)
  apy?: number;
  nav_per_token?: number;
  total_supply?: number;
  // Rental Property (RealT)
  property_address?: string;
  property_type?: string;
  annual_rent?: number;
  rental_yield?: number;
  token_price?: number;
  total_tokens?: number;
}

export interface Asset {
  id: string;
  protocol: Protocol;
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
    protocol: Protocol;
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
  byProtocol: Record<Protocol, number>;
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
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface AssetFilters {
  category?: Category;
  protocol?: Protocol;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "newest" | "volume";
  search?: string;
  page?: number;
  limit?: number;
}
