-- ============================================================
-- Forma — Initial Database Schema
-- Run in Supabase SQL Editor: https://supabase.com/dashboard
-- Project: adlmjdfmxpnehegxoana
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Profiles (extends Supabase Auth) ────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  designs_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Designs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Ontwerp',
  parts JSONB NOT NULL DEFAULT '[]',
  theme TEXT DEFAULT 'dark',
  is_stable BOOLEAN,
  stability_score INT CHECK (stability_score BETWEEN 0 AND 100),
  stability_grade TEXT CHECK (stability_grade IN ('A','B','C','D')),
  total_weight_kg DECIMAL(8,2) DEFAULT 0,
  total_cost_eur DECIMAL(10,2) DEFAULT 0,
  height_cm INT DEFAULT 0,
  width_cm INT DEFAULT 0,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Shops (B2B customers) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  monthly_requests INT DEFAULT 0,
  max_monthly_requests INT DEFAULT 1000,
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Analytics Events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_share_token ON designs(share_token);
CREATE INDEX IF NOT EXISTS idx_designs_is_public ON designs(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shops_api_key ON shops(api_key);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Designs: users manage their own; public designs readable by all
DROP POLICY IF EXISTS "Users manage own designs" ON designs;
CREATE POLICY "Users manage own designs"
  ON designs FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public designs readable" ON designs;
CREATE POLICY "Public designs readable"
  ON designs FOR SELECT
  USING (is_public = true);

-- Profiles: users manage their own profile
DROP POLICY IF EXISTS "Users manage own profile" ON profiles;
CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles readable by all" ON profiles;
CREATE POLICY "Profiles readable by all"
  ON profiles FOR SELECT
  USING (true);

-- Shops: owners manage their shop
DROP POLICY IF EXISTS "Shop owners manage their shop" ON shops;
CREATE POLICY "Shop owners manage their shop"
  ON shops FOR ALL
  USING (auth.uid() = owner_id);

-- Events: insert only (no reads via RLS)
DROP POLICY IF EXISTS "Insert events" ON events;
CREATE POLICY "Insert events"
  ON events FOR INSERT
  WITH CHECK (true);

-- ── Triggers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS designs_updated_at ON designs;
CREATE TRIGGER designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS shops_updated_at ON shops;
CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Increment design count on insert
CREATE OR REPLACE FUNCTION increment_designs_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET designs_count = designs_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS design_count_increment ON designs;
CREATE TRIGGER design_count_increment
  AFTER INSERT ON designs
  FOR EACH ROW EXECUTE FUNCTION increment_designs_count();

-- Decrement design count on delete
CREATE OR REPLACE FUNCTION decrement_designs_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET designs_count = GREATEST(0, designs_count - 1)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS design_count_decrement ON designs;
CREATE TRIGGER design_count_decrement
  AFTER DELETE ON designs
  FOR EACH ROW EXECUTE FUNCTION decrement_designs_count();

-- Increment view count on public design access
CREATE OR REPLACE FUNCTION increment_view_count(design_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE designs
  SET view_count = view_count + 1
  WHERE id = design_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
