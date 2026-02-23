-- ─── Documents (uploadable files per client/project) ─────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  file_url    text NOT NULL,
  type        text NOT NULL DEFAULT 'other'
    CHECK (type IN ('invoice', 'contract', 'other')),
  size_bytes  bigint,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own documents"
  ON documents FOR SELECT
  USING (client_id = auth.uid() OR is_admin());

CREATE POLICY "Admins manage documents"
  ON documents FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- ─── Link proposals to projects (optional FK) ────────────────────────────────
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(project_id);
