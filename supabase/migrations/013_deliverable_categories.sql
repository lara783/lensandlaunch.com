-- ─── Deliverable Categories & Orientation Tags ────────────────────────────────
-- category: one of carousel, static_post, infographic, video, short_form_reel
-- tags: array of orientation labels e.g. ['vertical', 'horizontal']

ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS category text
    CHECK (category IN ('carousel', 'static_post', 'infographic', 'video', 'short_form_reel')),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
