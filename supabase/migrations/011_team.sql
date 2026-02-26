-- ─── Team Members & Project Assignments ───────────────────────────────────────
-- Agency team members (managed by admin) and their assignments to client projects.
-- Clients see who is working on their project via the /team page.

CREATE TABLE IF NOT EXISTS team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  role       text NOT NULL,       -- e.g. "Photographer & Creative Director"
  email      text,
  phone      text,
  avatar_url text,
  bio        text,
  active     boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_team_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id  uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role_on_project text,           -- e.g. "Lead Photographer", "Video Editor"
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS project_team_assignments_project_id_idx
  ON project_team_assignments (project_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments ENABLE ROW LEVEL SECURITY;

-- Admins full access to team_members
CREATE POLICY "Admins manage team members"
  ON team_members FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients can read active team members assigned to their projects
CREATE POLICY "Clients view team members on their projects"
  ON team_members FOR SELECT
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM project_team_assignments pta
      JOIN projects p ON p.id = pta.project_id
      WHERE pta.team_member_id = team_members.id
        AND p.client_id = auth.uid()
    )
  );

-- Admins full access to assignments
CREATE POLICY "Admins manage project team assignments"
  ON project_team_assignments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients can read assignments for their own projects
CREATE POLICY "Clients view their project team assignments"
  ON project_team_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_team_assignments.project_id
        AND p.client_id = auth.uid()
    )
  );

-- ─── Seed: Lara as first team member ─────────────────────────────────────────
INSERT INTO team_members (name, role, email, phone, bio, sort_order)
VALUES (
  'Lara Lawson',
  'Founder & Creative Director',
  'lara@lensandlaunch.com',
  NULL,
  'Lara is the founder of Lens & Launch Media. She leads creative direction, photography, videography, and content strategy for all clients.',
  0
) ON CONFLICT DO NOTHING;
