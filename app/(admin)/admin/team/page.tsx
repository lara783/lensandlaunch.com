import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import AdminTeamClient from "./AdminTeamClient";

export default async function AdminTeamPage() {
  const supabase = await createClient();

  const [{ data: teamMembers }, { data: projects }, { data: assignments }] = await Promise.all([
    (supabase as any).from("team_members").select("*").order("sort_order").order("created_at"),
    (supabase as any).from("projects").select("id, name, client_id, profiles(full_name)").eq("status", "active"),
    (supabase as any).from("project_team_assignments").select("*"),
  ]);

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Team"
        subtitle="Manage your team members and assign them to client projects."
      />
      <div className="mt-8">
        <AdminTeamClient
          teamMembers={teamMembers ?? []}
          projects={projects ?? []}
          assignments={assignments ?? []}
        />
      </div>
    </div>
  );
}
