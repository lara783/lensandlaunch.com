ALTER TABLE profiles ADD COLUMN IF NOT EXISTS proposals_enabled boolean NOT NULL DEFAULT true;
