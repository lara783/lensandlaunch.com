-- ─── Meeting Logs ─────────────────────────────────────────────────────────────
-- Stores logged meeting notes, creative direction, and content planning
-- per client. Optionally linked to a calendar_event row.

CREATE TABLE IF NOT EXISTS meeting_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
  calendar_event_id uuid REFERENCES calendar_events(id) ON DELETE SET NULL,
  title             text NOT NULL,
  held_at           date NOT NULL,
  meeting_type      text NOT NULL DEFAULT 'creative_direction'
    CHECK (meeting_type IN ('creative_direction','strategy','review','kickoff','analytics','other')),
  attendees         text,
  notes             text,          -- Meeting minutes / general notes
  content_planned   text,          -- Content ideas discussed (what we're making)
  action_items      text,          -- Follow-up tasks
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meeting_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meeting logs"
  ON meeting_logs FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
