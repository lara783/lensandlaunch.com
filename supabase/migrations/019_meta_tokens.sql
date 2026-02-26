-- ─── Meta Business Suite credentials ─────────────────────────────────────────
-- Stores per-client Meta API credentials for auto-fetching Facebook + Instagram
-- insights. Tokens are long-lived Page Access Tokens (60-day, renewable).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS meta_page_token     text,          -- Long-lived Page Access Token
  ADD COLUMN IF NOT EXISTS meta_fb_page_id     text,          -- Facebook Page ID
  ADD COLUMN IF NOT EXISTS meta_ig_account_id  text,          -- Instagram Business Account ID
  ADD COLUMN IF NOT EXISTS meta_token_synced_at timestamptz;  -- When last successfully synced

-- Allow admins to update any client profile
-- (needed to save Meta credentials on a client's row)
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
