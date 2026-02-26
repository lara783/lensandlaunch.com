import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/layout/TopBar";
import WorkspaceDashboard from "./WorkspaceDashboard";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find team member record for this user
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single();

  const { data: teamMember } = await serviceClient
    .from("team_members")
    .select("*")
    .eq("email", profile?.email ?? "")
    .maybeSingle();

  // If no team member record yet, show empty state
  if (!teamMember) {
    return (
      <div className="p-6 md:p-8 w-full">
        <TopBar title="Workspace" subtitle="Your team dashboard" />
        <div className="mt-8 rounded-2xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Your workspace is being set up. Ask an admin to link your account.
          </p>
        </div>
      </div>
    );
  }

  // Get project assignments for this team member
  const { data: assignments } = await serviceClient
    .from("project_team_assignments")
    .select("*, projects(id, name, status, service_type, client_id)")
    .eq("team_member_id", teamMember.id);

  const projectIds = (assignments ?? []).map((a: any) => a.project_id).filter(Boolean);

  // Get deliverables for assigned projects
  const { data: deliverables } = projectIds.length > 0
    ? await serviceClient
        .from("deliverables")
        .select("*")
        .in("project_id", projectIds)
        .eq("agency_approved", false)
        .order("due_date", { ascending: true })
        .limit(10)
    : { data: [] };

  // Get upcoming calendar events for assigned projects (next 14 days)
  const now = new Date().toISOString();
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = projectIds.length > 0
    ? await serviceClient
        .from("calendar_events")
        .select("*")
        .in("project_id", projectIds)
        .gte("start_date", now)
        .lte("start_date", twoWeeks)
        .order("start_date", { ascending: true })
        .limit(10)
    : { data: [] };

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Workspace"
        subtitle={`Welcome back, ${teamMember.name.split(" ")[0]}`}
      />
      <div className="mt-8">
        <WorkspaceDashboard
          teamMember={teamMember}
          assignments={assignments ?? []}
          pendingDeliverables={deliverables ?? []}
          upcomingEvents={events ?? []}
        />
      </div>
    </div>
  );
}
