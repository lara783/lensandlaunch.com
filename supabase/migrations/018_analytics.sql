-- ─── Content Analytics ────────────────────────────────────────────────────────
-- Manual analytics reports per client per platform per reporting period.
-- Designed for Facebook, Instagram, TikTok data from Meta Business Suite.

CREATE TABLE IF NOT EXISTS content_analytics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  platform        text NOT NULL
    CHECK (platform IN ('facebook','instagram','tiktok')),
  reach           int,
  impressions     int,
  engagement_rate numeric(5,2),   -- e.g. 4.72 = 4.72%
  new_followers   int,
  total_followers int,
  top_post_url    text,
  top_post_reach  int,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage analytics"
  ON content_analytics FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
