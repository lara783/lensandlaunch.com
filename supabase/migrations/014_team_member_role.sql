-- ─── Team Member Role ─────────────────────────────────────────────────────────
-- Adds 'team' as a valid profile role so agency staff can log in.
-- Team members are matched to team_members rows by their login email.

-- Widen the role CHECK constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'client', 'team'));

-- Add profile_id to team_members for explicit auth link (optional — email match also works)
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS team_members_profile_id_idx
  ON team_members (profile_id);

-- ─── RLS additions ────────────────────────────────────────────────────────────

-- Team members can read their own team_members row
CREATE POLICY IF NOT EXISTS "Team members read own record"
  ON team_members FOR SELECT
  USING (
    profile_id = auth.uid()
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Team members can read project_team_assignments where they are the member
CREATE POLICY IF NOT EXISTS "Team members view own assignments"
  ON project_team_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = project_team_assignments.team_member_id
        AND (tm.profile_id = auth.uid()
          OR tm.email = (SELECT email FROM profiles WHERE id = auth.uid()))
    )
  );
