-- Add analytics_enabled flag to profiles (paid feature gate)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_enabled boolean NOT NULL DEFAULT false;

-- Allow clients to read their own analytics ONLY if analytics_enabled = true
CREATE POLICY "clients_read_own_analytics"
  ON content_analytics FOR SELECT
  USING (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND analytics_enabled = true
    )
  );
