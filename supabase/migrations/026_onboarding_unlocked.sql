ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_unlocked boolean NOT NULL DEFAULT false;

-- Grandfather in existing clients who are already onboarded or have accepted a proposal
UPDATE profiles
SET onboarding_unlocked = true
WHERE role = 'client'
  AND (
    onboarding_complete = true
    OR id IN (
      SELECT DISTINCT client_id FROM proposals WHERE status = 'accepted'
    )
  );
