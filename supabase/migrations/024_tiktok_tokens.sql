-- 024_tiktok_tokens.sql
-- Adds TikTok OAuth token storage to profiles.
-- Access tokens expire after 24h; refresh tokens last 365 days.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tiktok_access_token    text,
  ADD COLUMN IF NOT EXISTS tiktok_refresh_token   text,
  ADD COLUMN IF NOT EXISTS tiktok_open_id         text,
  ADD COLUMN IF NOT EXISTS tiktok_token_synced_at timestamptz;
