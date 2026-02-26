-- ─── Scheduled Emails ─────────────────────────────────────────────────────────
-- Tracks upcoming automated emails (e.g., monthly retainer booking reminders).
-- A Vercel Cron job queries rows where send_at <= now() AND sent = false,
-- sends them via Resend, then marks sent = true.

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          text NOT NULL,
  -- 'retainer_booking_reminder'
  meeting_type  text,
  -- 'strategy' | 'creative_direction' | 'analytics'
  send_at       timestamptz NOT NULL,
  sent          boolean NOT NULL DEFAULT false,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_emails_send_at_idx
  ON scheduled_emails (send_at) WHERE sent = false;

CREATE INDEX IF NOT EXISTS scheduled_emails_client_id_idx
  ON scheduled_emails (client_id);

ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Only admins and service role (cron) access this table
CREATE POLICY "Admins manage scheduled emails"
  ON scheduled_emails FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
