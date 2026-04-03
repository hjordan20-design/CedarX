// TypeScript types mirroring the Supabase schema for the RelayX marketplace.

export interface Database {
    public: {
        Tables: {
            properties: {
                Row: PropertyRow;
                Insert: PropertyInsert;
                Update: Partial<PropertyInsert>;
            };
            keys: {
                Row: KeyRow;
                Insert: KeyInsert;
                Update: Partial<KeyInsert>;
            };
            listings: {
                Row: ListingRow;
                Insert: ListingInsert;
                Update: Partial<ListingInsert>;
            };
            redemptions: {
                Row: RedemptionRow;
                Insert: RedemptionInsert;
                Update: Partial<RedemptionInsert>;
            };
            points: {
                Row: PointRow;
                Insert: PointInsert;
                Update: never;
            };
        };
    };
}

// ─── properties ─────────────────────────────────────────────────────────────

export interface PropertyRow {
    id: string;
    building_name: string;
    neighborhood: string | null;
    city: string;
    state: string;
    beds: number;
    baths: number;
    sqft: number;
    floor: number | null;
    description: string | null;
    amenities: unknown[];
    photos: string[];
    landlord_wallet: string | null;
    pm_id: string | null;
    status: "active" | "inactive";
    created_at: string;
}

export interface PropertyInsert {
    building_name: string;
    neighborhood?: string | null;
    city: string;
    state?: string;
    beds: number;
    baths: number;
    sqft: number;
    floor?: number | null;
    description?: string | null;
    amenities?: unknown[];
    photos?: string[];
    landlord_wallet?: string | null;
    pm_id?: string | null;
    status?: "active" | "inactive";
}

// ─── keys ───────────────────────────────────────────────────────────────────

export interface KeyRow {
    id: string;
    property_id: string;
    unit: string;
    start_date: string;
    end_date: string;
    price_usdc: number;
    status: "tradeable" | "redeemed" | "active" | "expired";
    owner_wallet: string | null;
    token_id: number | null;
    minted_at: string | null;
    redeemed_at: string | null;
    expired_at: string | null;
    created_at: string;
}

export interface KeyInsert {
    property_id: string;
    unit: string;
    start_date: string;
    end_date: string;
    price_usdc: number;
    status?: "tradeable" | "redeemed" | "active" | "expired";
    owner_wallet?: string | null;
    token_id?: number | null;
    minted_at?: string | null;
    redeemed_at?: string | null;
    expired_at?: string | null;
}

// ─── listings ───────────────────────────────────────────────────────────────

export interface ListingRow {
    id: string;
    key_id: string;
    seller_wallet: string;
    asking_price_usdc: number;
    status: "active" | "sold" | "cancelled";
    listed_at: string;
    sold_at: string | null;
}

export interface ListingInsert {
    key_id: string;
    seller_wallet: string;
    asking_price_usdc: number;
    status?: "active" | "sold" | "cancelled";
    sold_at?: string | null;
}

// ─── redemptions ────────────────────────────────────────────────────────────

export interface RedemptionRow {
    id: string;
    key_id: string;
    wallet: string;
    screening_status: "pending" | "approved" | "denied";
    deposit_amount_usdc: number | null;
    deposit_status: "held" | "released" | "claimed" | null;
    move_in_date: string | null;
    move_out_date: string | null;
    created_at: string;
}

export interface RedemptionInsert {
    key_id: string;
    wallet: string;
    screening_status?: "pending" | "approved" | "denied";
    deposit_amount_usdc?: number | null;
    deposit_status?: "held" | "released" | "claimed" | null;
    move_in_date?: string | null;
    move_out_date?: string | null;
}

// ─── points ─────────────────────────────────────────────────────────────────

export interface PointRow {
    id: string;
    wallet: string;
    event_type: "mint" | "purchase" | "redeem";
    amount: number;
    created_at: string;
}

export interface PointInsert {
    wallet: string;
    event_type: "mint" | "purchase" | "redeem";
    amount: number;
}
