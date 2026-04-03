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
}
