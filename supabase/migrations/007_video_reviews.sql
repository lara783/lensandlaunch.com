-- ─── Video Reviews ────────────────────────────────────────────────────────────
-- Stores video review sessions attached to deliverables.
-- Admin uploads the video; client watches, annotates, then approves or requests changes.

CREATE TABLE IF NOT EXISTS deliverable_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  uuid NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  video_url       text NOT NULL,
  annotations     jsonb NOT NULL DEFAULT '[]',
  -- Each annotation: { id, timestamp_seconds, shape: 'circle'|'rect',
  --                    x, y, w, h, color, note, created_by, created_at }
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'changes_requested')),
  reviewer_note   text,
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliverable_reviews_deliverable_id_idx
  ON deliverable_reviews (deliverable_id);

ALTER TABLE deliverable_reviews ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins manage deliverable reviews"
  ON deliverable_reviews FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients can SELECT reviews for deliverables in their own projects
CREATE POLICY "Clients view own deliverable reviews"
  ON deliverable_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = deliverable_reviews.deliverable_id
        AND p.client_id = auth.uid()
    )
  );

-- Clients can UPDATE annotations + status (but not video_url or created_at)
CREATE POLICY "Clients annotate and review deliverables"
  ON deliverable_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = deliverable_reviews.deliverable_id
        AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM deliverables d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = deliverable_reviews.deliverable_id
        AND p.client_id = auth.uid()
    )
  );
