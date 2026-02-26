-- 022_esig_onboarding.sql
-- Adds e-signature credential columns to proposals and onboarding_complete flag to profiles

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS client_signature_name    text,
  ADD COLUMN IF NOT EXISTS client_signature_email   text,
  ADD COLUMN IF NOT EXISTS client_signature_phone   text,
  ADD COLUMN IF NOT EXISTS admin_signature_name     text,
  ADD COLUMN IF NOT EXISTS admin_signature_data     text,
  ADD COLUMN IF NOT EXISTS admin_signed_at          timestamptz;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
