-- =============================================================================
-- CedarX Database Schema
-- PostgreSQL (Supabase)
-- =============================================================================
-- Run this in the Supabase SQL editor to initialise the database.
-- The schema is idempotent — safe to run multiple times.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
-- One row per indexed real-world asset.  Details that vary by protocol are
-- stored in the `details` JSONB column rather than in sparse nullable columns.
-- The `id` is stable and deterministic: "{protocol}:{chainId}:{address}:{tokenId}"
-- for NFTs and "{protocol}:{chainId}:{address}" for ERC-20s.

CREATE TABLE IF NOT EXISTS assets (
    -- Identity
    id                   TEXT        PRIMARY KEY,
    protocol             TEXT        NOT NULL CHECK (protocol IN ('fabrica', '4k', 'courtyard')),
    contract_address     TEXT        NOT NULL,
    token_id             TEXT,                          -- NULL for ERC-20
    token_standard       TEXT        NOT NULL CHECK (token_standard IN ('ERC-721', 'ERC-1155', 'ERC-20')),
    chain                TEXT        NOT NULL DEFAULT 'ethereum',

    -- Display
    name                 TEXT        NOT NULL,
    description          TEXT,
    category             TEXT        NOT NULL CHECK (category IN ('real-estate', 'luxury-goods', 'art', 'collectibles')),
    image_url            TEXT,

    -- Protocol-specific details (flexible JSONB)
    details              JSONB       NOT NULL DEFAULT '{}',

    -- Market data (updated by indexer + CedarX swap poller)
    last_sale_price      NUMERIC(36, 6),               -- USDC, 6 decimal precision
    current_listing_price NUMERIC(36, 6),              -- From active CedarX swap listing
    total_volume         NUMERIC(36, 6) NOT NULL DEFAULT 0,

    -- External link to the protocol's own asset page
    external_url         TEXT,

    -- Housekeeping
    last_updated         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_protocol   ON assets (protocol);
CREATE INDEX IF NOT EXISTS idx_assets_category   ON assets (category);
CREATE INDEX IF NOT EXISTS idx_assets_contract   ON assets (contract_address);
-- GIN index for JSONB details queries (e.g. details->>'state', details->>'apy')
CREATE INDEX IF NOT EXISTS idx_assets_details    ON assets USING GIN (details);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
-- Mirrors the onchain state of the CedarX swap contract.
-- One row per listing ID emitted by the contract.
-- Status transitions: active → sold | cancelled

CREATE TABLE IF NOT EXISTS listings (
    -- Onchain listing ID (from the contract's nextListingId counter)
    listing_id           BIGINT      PRIMARY KEY,

    -- Cross-referenced asset (may be NULL briefly before asset is indexed)
    asset_id             TEXT        REFERENCES assets (id) ON DELETE SET NULL,

    -- Onchain listing fields
    seller               TEXT        NOT NULL,          -- checksummed address
    token_contract       TEXT        NOT NULL,
    token_id             TEXT,                          -- NULL for ERC-20 listings
    quantity             NUMERIC(78) NOT NULL,          -- Raw token units
    asking_price         NUMERIC(36, 6) NOT NULL,       -- USDC, 6 decimals

    token_standard       TEXT        NOT NULL CHECK (token_standard IN ('ERC-721', 'ERC-1155', 'ERC-20')),
    status               TEXT        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'sold', 'cancelled')),

    -- Where we first saw this listing
    tx_hash              TEXT        NOT NULL,
    block_number         BIGINT      NOT NULL,
    log_index            INT         NOT NULL,

    -- Timestamps (derived from block, but stored for convenience)
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_status       ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_seller       ON listings (seller);
CREATE INDEX IF NOT EXISTS idx_listings_token        ON listings (token_contract);
CREATE INDEX IF NOT EXISTS idx_listings_asset        ON listings (asset_id);

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------
-- One row per Sold event emitted by the CedarX swap contract.

CREATE TABLE IF NOT EXISTS trades (
    -- Stable ID: tx_hash + colon + log_index
    id                   TEXT        PRIMARY KEY,

    listing_id           BIGINT      REFERENCES listings (listing_id),
    asset_id             TEXT        REFERENCES assets (id) ON DELETE SET NULL,

    buyer                TEXT        NOT NULL,
    seller               TEXT        NOT NULL,
    sale_price           NUMERIC(36, 6) NOT NULL,       -- USDC
    fee                  NUMERIC(36, 6) NOT NULL,       -- Platform fee

    tx_hash              TEXT        NOT NULL,
    block_number         BIGINT      NOT NULL,
    log_index            INT         NOT NULL,

    -- Block timestamp (fetched from RPC or estimated)
    traded_at            TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trades_asset    ON trades (asset_id);
CREATE INDEX IF NOT EXISTS idx_trades_buyer    ON trades (buyer);
CREATE INDEX IF NOT EXISTS idx_trades_seller   ON trades (seller);
CREATE INDEX IF NOT EXISTS idx_trades_block    ON trades (block_number);

-- ---------------------------------------------------------------------------
-- indexer_cursors
-- ---------------------------------------------------------------------------
-- Tracks the last processed block number for each poller.
-- On restart, pollers resume from last_block rather than scanning from genesis.

CREATE TABLE IF NOT EXISTS indexer_cursors (
    poller_id            TEXT        PRIMARY KEY,      -- 'fabrica' | 'ondo' | 'realt' | 'cedarx-swap'
    last_block           BIGINT      NOT NULL DEFAULT 0,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the cursor rows so pollers can UPDATE rather than INSERT-or-UPDATE
INSERT INTO indexer_cursors (poller_id, last_block) VALUES
    ('fabrica',      0),
    ('4k',           0),
    ('courtyard',    0),
    ('cedarx-swap',  0)
ON CONFLICT (poller_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Migration: upgrading an existing deployment from Ondo/RealT to 4K/Courtyard
-- ---------------------------------------------------------------------------
-- Run these statements ONCE on existing Supabase databases.
-- They are idempotent (use IF EXISTS / IF NOT EXISTS).
--
-- 1. Drop old CHECK constraints and add new ones:
-- ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_protocol_check;
-- ALTER TABLE assets ADD CONSTRAINT assets_protocol_check
--     CHECK (protocol IN ('fabrica', '4k', 'courtyard'));
--
-- ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_category_check;
-- ALTER TABLE assets ADD CONSTRAINT assets_category_check
--     CHECK (category IN ('real-estate', 'luxury-goods', 'art', 'collectibles'));
--
-- 2. Rename existing Fabrica asset categories:
-- UPDATE assets SET category = 'real-estate' WHERE category = 'land';
--
-- 3. Remove Ondo and RealT data (optional — they will never update again):
-- DELETE FROM assets WHERE protocol IN ('ondo', 'realt');
-- DELETE FROM indexer_cursors WHERE poller_id IN ('ondo', 'realt');
--
-- 4. Add new cursor rows:
-- INSERT INTO indexer_cursors (poller_id, last_block)
--     VALUES ('4k', 0), ('courtyard', 0)
--     ON CONFLICT (poller_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at on listings
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_updated_at ON listings;
CREATE TRIGGER listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security (Supabase)
-- ---------------------------------------------------------------------------
-- The indexer uses the service-role key (bypasses RLS).
-- The frontend uses the anon key — give it read-only access to all tables.

ALTER TABLE assets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades          ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexer_cursors ENABLE ROW LEVEL SECURITY;

-- Public read access for the frontend (anon key)
-- CREATE POLICY IF NOT EXISTS is not supported in PostgreSQL 15 (Supabase free tier),
-- so we use DO blocks to swallow the duplicate_object error on re-runs.
DO $$ BEGIN
    CREATE POLICY "anon read assets" ON assets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "anon read listings" ON listings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "anon read trades" ON trades FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No public access to internal cursor state
-- (indexer_cursors only accessible via service-role key)
