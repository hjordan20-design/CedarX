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
            seaport_orders: {
                Row: SeaportOrderRow;
                Insert: SeaportOrderInsert;
                Update: Partial<SeaportOrderInsert>;
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
    protocol: "fabrica" | "4k" | "courtyard" | "arianee";
    contract_address: string;
    token_id: string | null;
    token_standard: "ERC-721" | "ERC-1155" | "ERC-20";
    chain: string;
    name: string;
    description: string | null;
    category: "real-estate" | "luxury-goods" | "art" | "collectibles";
    image_url: string | null;
    details: AssetDetails;
    last_sale_price: number | null;
    current_listing_price: number | null;
    current_listing_payment_token_symbol?: string | null;
    total_volume: number;
    has_active_listing: boolean;
    external_url: string | null;
    last_updated: string;
    created_at: string;
}

export type AssetInsert = Omit<AssetRow, "created_at"> & { created_at?: string };

// Protocol-specific details stored as JSONB
export interface AssetDetails {
    // Real Estate (Fabrica, Propy, Roofstock)
    location?: string;
    acreage?: number;
    parcel_id?: string;
    county?: string;
    state?: string;
    lat?: number;
    lng?: number;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;

    // Luxury Goods (4K)
    brand?: string;
    model?: string;
    year?: number;
    condition?: string;
    serial?: string;

    // Art & Collectibles (Courtyard, future)
    artist?: string;
    medium?: string;
    dimensions?: string;
    provenance?: string;
    edition?: string;
    series?: string;
    grade?: string;
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

// ─── seaport_orders ──────────────────────────────────────────────────────────

/** Full Seaport order stored for fulfillment: parameters + signature. */
export interface SeaportOrderParameters {
    offerer: string;
    zone: string;
    offer: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
    }>;
    consideration: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
        recipient: string;
    }>;
    orderType: number;
    startTime: string;
    endTime: string;
    zoneHash: string;
    salt: string;
    conduitKey: string;
    totalOriginalConsiderationItems: number;
}

export interface SeaportOrderBlob {
    parameters: SeaportOrderParameters;
    signature: string;
}

export interface SeaportOrderRow {
    order_hash: string;
    asset_id: string | null;
    chain: string;
    seller_address: string;
    price: string;                           // raw amount in payment token units
    payment_token: string;                   // 0x000…0 for ETH
    payment_token_symbol: string;
    payment_token_decimals: number;
    price_usd: string | null;
    expiration: string | null;
    order_parameters: SeaportOrderBlob;
    source: "opensea" | "cedarx";
    status: "active" | "filled" | "cancelled" | "expired";
    created_at: string;
    updated_at: string;
}

export type SeaportOrderInsert = Omit<SeaportOrderRow, "created_at" | "updated_at"> & {
    created_at?: string;
    updated_at?: string;
};
