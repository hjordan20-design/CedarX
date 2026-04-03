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
}
