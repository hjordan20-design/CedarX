// TypeScript types mirroring the Supabase schema.
// These are used by the Supabase client for type-safe queries.

export interface Database {
    public: {
        Tables: {
            assets: {
                Row: AssetRow;
                Insert: AssetInsert;
                Update: Partial<AssetInsert>;
            };
            listings: {
                Row: ListingRow;
                Insert: ListingInsert;
                Update: Partial<ListingInsert>;
            };
            trades: {
                Row: TradeRow;
                Insert: TradeInsert;
                Update: never;
            };
            indexer_cursors: {
                Row: CursorRow;
                Insert: CursorInsert;
                Update: Partial<CursorInsert>;
            };
        };
    };
}

// ─── assets ──────────────────────────────────────────────────────────────────

export interface AssetRow {
    id: string;
    protocol: "fabrica" | "ondo" | "realt";
    contract_address: string;
    token_id: string | null;
    token_standard: "ERC-721" | "ERC-1155" | "ERC-20";
    chain: string;
    name: string;
    description: string | null;
    category: "land" | "fixed-income" | "rental-property";
    image_url: string | null;
    details: AssetDetails;
    last_sale_price: number | null;
    current_listing_price: number | null;
    total_volume: number;
    external_url: string | null;
    last_updated: string;
    created_at: string;
}

export type AssetInsert = Omit<AssetRow, "created_at"> & { created_at?: string };

// Protocol-specific details stored as JSONB
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

// ─── listings ────────────────────────────────────────────────────────────────

export interface ListingRow {
    listing_id: number;
    asset_id: string | null;
    seller: string;
    token_contract: string;
    token_id: string | null;
    quantity: string;
    asking_price: string;
    token_standard: "ERC-721" | "ERC-1155" | "ERC-20";
    status: "active" | "sold" | "cancelled";
    tx_hash: string;
    block_number: number;
    log_index: number;
    created_at: string;
    updated_at: string;
}

export type ListingInsert = Omit<ListingRow, "updated_at"> & { updated_at?: string };

// ─── trades ──────────────────────────────────────────────────────────────────

export interface TradeRow {
    id: string;
    listing_id: number | null;
    asset_id: string | null;
    buyer: string;
    seller: string;
    sale_price: string;
    fee: string;
    tx_hash: string;
    block_number: number;
    log_index: number;
    traded_at: string;
}

export type TradeInsert = TradeRow;

// ─── indexer_cursors ─────────────────────────────────────────────────────────

export interface CursorRow {
    poller_id: string;
    last_block: number;
    updated_at: string;
}

export type CursorInsert = Omit<CursorRow, "updated_at"> & { updated_at?: string };
