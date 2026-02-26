import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get the client's active project
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", user.id)
    .eq("status", "active")
    .limit(1);

  const projectId = projects?.[0]?.id ?? null;

  // Get team assignments for this project, joined with team member info
  const { data: assignments } = projectId
    ? await (supabase as any)
        .from("project_team_assignments")
        .select("id, role_on_project, team_members(*)")
        .eq("project_id", projectId)
    : { data: [] };

  const teamWithRoles = (assignments ?? []).map((a: any) => ({
    ...a.team_members,
    role_on_project: a.role_on_project,
    assignment_id: a.id,
  }));

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Meet the Team"
        subtitle="The people working on your project."
      />
      <div className="mt-8">
        <TeamClient team={teamWithRoles} projectName={projects?.[0]?.name ?? null} />
      </div>
    </div>
  );
}
