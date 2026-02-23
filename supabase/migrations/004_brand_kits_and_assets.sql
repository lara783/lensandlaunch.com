-- ─── Brand Kits ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_kits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  colors      jsonb NOT NULL DEFAULT '[]',
  fonts       jsonb NOT NULL DEFAULT '[]',
  logo_url    text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own brand kit"
  ON brand_kits FOR SELECT
  USING (client_id = auth.uid() OR is_admin());

CREATE POLICY "Clients upsert own brand kit"
  ON brand_kits FOR INSERT
  WITH CHECK (client_id = auth.uid() OR is_admin());

CREATE POLICY "Clients update own brand kit"
  ON brand_kits FOR UPDATE
  USING (client_id = auth.uid() OR is_admin());

CREATE POLICY "Admins delete brand kits"
  ON brand_kits FOR DELETE
  USING (is_admin());

-- ─── Client Assets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  file_url    text NOT NULL,
  asset_type  text NOT NULL DEFAULT 'other',
  size_bytes  bigint,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own assets"
  ON client_assets FOR SELECT
  USING (client_id = auth.uid() OR is_admin());

CREATE POLICY "Clients insert own assets"
  ON client_assets FOR INSERT
  WITH CHECK (client_id = auth.uid() OR is_admin());

CREATE POLICY "Clients delete own assets"
  ON client_assets FOR DELETE
  USING (client_id = auth.uid() OR is_admin());

CREATE INDEX IF NOT EXISTS idx_client_assets_client_id ON client_assets(client_id);

-- ─── Proposals: signature columns ─────────────────────────────────────────────
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Allow clients to write signature data when accepting
DROP POLICY IF EXISTS "Clients update proposal status" ON proposals;
CREATE POLICY "Clients update proposal status"
  ON proposals FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (status IN ('accepted', 'declined'));
