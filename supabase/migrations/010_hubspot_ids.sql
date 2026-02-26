-- ─── HubSpot CRM IDs ──────────────────────────────────────────────────────────
-- Adds HubSpot foreign key columns so the portal can sync contacts and deals
-- without creating duplicates on repeated syncs.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text;

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS hubspot_deal_id text;

-- Indexes for quick lookup during sync
CREATE INDEX IF NOT EXISTS profiles_hubspot_contact_id_idx
  ON profiles (hubspot_contact_id) WHERE hubspot_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS proposals_hubspot_deal_id_idx
  ON proposals (hubspot_deal_id) WHERE hubspot_deal_id IS NOT NULL;
