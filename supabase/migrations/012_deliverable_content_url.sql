-- ─── Deliverable content URL ──────────────────────────────────────────────────
-- Stores an external URL (e.g. Instagram carousel post, frame.io link) for
-- deliverables that are not video uploads. Used for carousels and static posts.

ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS content_url text;
