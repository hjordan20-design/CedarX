-- =============================================================================
-- RelayX Marketplace Database Schema
-- PostgreSQL (Supabase)
-- =============================================================================

-- properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_name TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'FL',
  beds INT NOT NULL,
  baths INT NOT NULL,
  sqft INT NOT NULL,
  floor INT,
  description TEXT,
  amenities JSONB DEFAULT '[]',
  photos TEXT[] DEFAULT '{}',
  landlord_wallet TEXT,
  pm_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- keys table
CREATE TABLE keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  unit TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_usdc NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'tradeable' CHECK (status IN ('tradeable', 'redeemed', 'active', 'expired')),
  owner_wallet TEXT,
  token_id INT,
  minted_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES keys(id),
  seller_wallet TEXT NOT NULL,
  asking_price_usdc NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  listed_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ
);

-- redemptions table
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES keys(id),
  wallet TEXT NOT NULL,
  screening_status TEXT NOT NULL DEFAULT 'pending' CHECK (screening_status IN ('pending', 'approved', 'denied')),
  deposit_amount_usdc NUMERIC(18,2),
  deposit_status TEXT DEFAULT 'held' CHECK (deposit_status IN ('held', 'released', 'claimed')),
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- points table
CREATE TABLE points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('mint', 'purchase', 'redeem')),
  amount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_keys_property_id ON keys(property_id);
CREATE INDEX idx_keys_status ON keys(status);
CREATE INDEX idx_keys_owner_wallet ON keys(owner_wallet);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_key_id ON listings(key_id);
CREATE INDEX idx_redemptions_key_id ON redemptions(key_id);
CREATE INDEX idx_points_wallet ON points(wallet);
