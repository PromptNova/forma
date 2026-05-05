-- Migration 003: Stability Certificate columns
-- Run in Supabase Dashboard > SQL Editor

ALTER TABLE designs ADD COLUMN IF NOT EXISTS certificate_id TEXT UNIQUE;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS certificate_generated_at TIMESTAMPTZ;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS certificate_downloads INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_designs_certificate_id
  ON designs(certificate_id)
  WHERE certificate_id IS NOT NULL;

-- Optional: view to get top-shared designs
CREATE OR REPLACE VIEW top_certificates AS
SELECT
  id,
  name,
  stability_grade,
  stability_score,
  certificate_id,
  certificate_generated_at,
  certificate_downloads
FROM designs
WHERE certificate_id IS NOT NULL
ORDER BY certificate_downloads DESC;
