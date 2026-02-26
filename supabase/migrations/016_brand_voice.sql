-- ─── Brand Voice Fields ───────────────────────────────────────────────────────
-- Adds brand voice/demeanour fields to the existing brand_kits table.

ALTER TABLE brand_kits
  ADD COLUMN IF NOT EXISTS voice_tone        text,   -- e.g. "Professional, warm, aspirational"
  ADD COLUMN IF NOT EXISTS voice_audience    text,   -- Target audience description
  ADD COLUMN IF NOT EXISTS voice_messaging   text,   -- Key messaging pillars
  ADD COLUMN IF NOT EXISTS voice_words_use   text,   -- Words/phrases to use
  ADD COLUMN IF NOT EXISTS voice_words_avoid text,   -- Words/phrases to avoid
  ADD COLUMN IF NOT EXISTS voice_tagline     text;   -- Brand tagline/sign-off
