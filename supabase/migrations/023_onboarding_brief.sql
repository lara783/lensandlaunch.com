-- 023_onboarding_brief.sql
-- Stores the client's brand questionnaire responses, submitted during onboarding.
-- Keyed on client_id (one brief per client). submitted_at being non-null = brief is complete.

CREATE TABLE IF NOT EXISTS onboarding_briefs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Section 1: Business
  business_description text,
  products_services    text,
  point_of_difference  text,
  market_position      text,   -- 'budget' | 'mid-range' | 'premium' | 'luxury'

  -- Section 2: Audience
  ideal_customer       text,
  customer_location    text,
  customer_problems    text,

  -- Section 3: Brand & Voice
  brand_personality    text[],  -- e.g. ['professional','warm','inspiring']
  content_tone         text,    -- 'very-casual' | 'conversational' | 'balanced' | 'professional' | 'formal'
  topics_to_avoid      text,
  inspiring_accounts   text,

  -- Section 4: Content
  content_types        text[],  -- e.g. ['reels','carousels','behind-the-scenes']
  content_aesthetic    text,    -- 'bright-airy' | 'dark-moody' | 'bold-colourful' | 'clean-minimal' | 'warm-organic' | 'rustic-earthy'
  what_worked          text,

  -- Section 5: Goals
  primary_goal         text,    -- 'brand-awareness' | 'website-traffic' | 'leads' | 'grow-following' | 'sales' | 'community'
  success_definition   text,
  upcoming_events      text,

  submitted_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE onboarding_briefs ENABLE ROW LEVEL SECURITY;

-- Clients can read and write their own brief
CREATE POLICY "clients_manage_own_brief"
  ON onboarding_briefs
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Admins can read all briefs
CREATE POLICY "admins_read_all_briefs"
  ON onboarding_briefs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
