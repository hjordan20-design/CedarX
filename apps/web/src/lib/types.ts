// ─── Property ─────────────────────────────────────────────────────────────────

export interface Property {
  id: string;
  buildingName: string;
  neighborhood: string | null;
  city: string;
  state: string;
  beds: number;
  baths: number;
  sqft: number;
  floor: number | null;
  description: string | null;
  amenities: string[];
  photos: string[];
  landlordWallet: string | null;
  pmId: string | null;
  status: "active" | "inactive";
  createdAt: string;
  // Computed from keys
  keysAvailable?: number;
  minPrice?: number;
}

// ─── Key ──────────────────────────────────────────────────────────────────────

export type KeyStatus = "tradeable" | "redeemed" | "active" | "expired";

export interface Key {
  id: string;
  propertyId: string;
  unit: string;
  startDate: string;
  endDate: string;
  priceUsdc: number;
  status: KeyStatus;
  ownerWallet: string | null;
  tokenId: number | null;
  mintedAt: string | null;
  redeemedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  // Joined
  property?: Property;
}

// ─── Listing (Secondary Market) ──────────────────────────────────────────────

export type ListingStatus = "active" | "sold" | "cancelled";

export interface Listing {
  id: string;
  keyId: string;
  sellerWallet: string;
  askingPriceUsdc: number;
  status: ListingStatus;
  listedAt: string;
  soldAt: string | null;
  // Joined
  key?: Key;
}

// ─── Redemption ──────────────────────────────────────────────────────────────

export interface Redemption {
  id: string;
  keyId: string;
  wallet: string;
  screeningStatus: "pending" | "approved" | "denied";
  depositAmountUsdc: number | null;
  depositStatus: "held" | "released" | "claimed" | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  createdAt: string;
}

// ─── Points ──────────────────────────────────────────────────────────────────

export interface PointBalance {
  wallet: string;
  total: number;
  events: PointEvent[];
}

export interface PointEvent {
  id: string;
  wallet: string;
  eventType: "mint" | "purchase" | "redeem";
  amount: number;
  createdAt: string;
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

export interface PropertyFilters {
  city?: string;
  beds?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
