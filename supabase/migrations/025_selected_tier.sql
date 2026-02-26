-- Stores the package tier chosen by the client when accepting a proposal
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS selected_tier_name text;
