-- Extend calendar event types to include 'report'
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check
  CHECK (type IN ('shoot', 'edit', 'review', 'publish', 'meeting', 'report'));

-- Monthly reports tracking table
CREATE TABLE IF NOT EXISTS monthly_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  calendar_event_id   uuid REFERENCES calendar_events(id) ON DELETE SET NULL,
  report_period_start date NOT NULL,
  report_period_end   date NOT NULL,
  pdf_url             text,
  generated_at        timestamptz,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'done', 'failed')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS: Admins can do everything; clients can read their own completed reports
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_monthly_reports"
  ON monthly_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clients_read_own_reports"
  ON monthly_reports FOR SELECT
  USING (
    client_id = auth.uid() AND status = 'done'
  );
