-- ============================================================
-- Forma Migration 002 — AI Photo-to-3D Conversions
-- Run: paste into Supabase SQL Editor and execute
-- ============================================================

-- ── AI conversion tracking ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id             UUID        REFERENCES shops(id),
  status              TEXT        DEFAULT 'pending'
                                  CHECK (status IN ('pending','processing','completed','failed')),
  original_image_url  TEXT        NOT NULL,
  model_url           TEXT,
  preview_url         TEXT,
  part_name           TEXT        NOT NULL,
  part_kind           TEXT        NOT NULL,
  estimated_height_cm DECIMAL,
  estimated_width_cm  DECIMAL,
  fal_request_id      TEXT,
  error_message       TEXT,
  processing_time_ms  INT,
  cost_usd            DECIMAL(6,4) DEFAULT 0.30,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- ── Quota per user per month ──────────────────────────────────
CREATE TABLE IF NOT EXISTS conversion_quota (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  month_year          TEXT        NOT NULL,  -- e.g. '2025-05'
  conversions_used    INT         DEFAULT 0,
  conversions_limit   INT         DEFAULT 3, -- free:3 pro:25 business:999999
  UNIQUE(user_id, month_year)
);

-- ── shop_parts: add AI model columns ─────────────────────────
ALTER TABLE shop_parts
  ADD COLUMN IF NOT EXISTS model_glb_url      TEXT,
  ADD COLUMN IF NOT EXISTS preview_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS source             TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','ai_converted')),
  ADD COLUMN IF NOT EXISTS conversion_id      UUID REFERENCES ai_conversions(id);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_conversions_user_created
  ON ai_conversions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_quota_user_month
  ON conversion_quota(user_id, month_year);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE ai_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_quota ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversions
CREATE POLICY IF NOT EXISTS "ai_conversions_owner"
  ON ai_conversions FOR ALL
  USING (auth.uid() = user_id);

-- Users can only see their own quota
CREATE POLICY IF NOT EXISTS "conversion_quota_owner"
  ON conversion_quota FOR ALL
  USING (auth.uid() = user_id);
