-- ─── Project Brief Fields ─────────────────────────────────────────────────────
-- Operational details for team members: location, timing, access, mood board.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS shoot_location  text,
  ADD COLUMN IF NOT EXISTS call_time       text,
  ADD COLUMN IF NOT EXISTS access_notes   text,
  ADD COLUMN IF NOT EXISTS mood_board_url text,
  ADD COLUMN IF NOT EXISTS internal_brief text;

-- ─── Team Assignment Notes ─────────────────────────────────────────────────────
-- Internal notes per team member per project, written by admin.
-- E.g. "Experience lead — must be on location for shoot, bring lighting kit"

ALTER TABLE project_team_assignments
  ADD COLUMN IF NOT EXISTS team_notes text;
