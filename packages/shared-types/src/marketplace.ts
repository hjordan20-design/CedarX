export type ListingStatus = "active" | "sold" | "cancelled";

export interface Listing {
  id: string;
  keyId: string;
  sellerWallet: string;
  askingPriceUsdc: number;
  status: ListingStatus;
  listedAt: string;
  soldAt: string | null;
}

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

export interface PointEvent {
  id: string;
  wallet: string;
  eventType: "mint" | "purchase" | "redeem";
  amount: number;
  createdAt: string;
}
