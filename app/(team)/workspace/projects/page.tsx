import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/layout/TopBar";
import WorkspaceProjectsClient from "./WorkspaceProjectsClient";

const SCOPE_KEYWORDS = ["scope", "deliverable", "service", "inclusions", "what's included", "brief", "creative direction", "what you"];

function extractScopeSection(content: { heading: string; body: string }[]) {
  return content.filter((s) =>
    SCOPE_KEYWORDS.some((kw) => s.heading.toLowerCase().includes(kw))
  );
}

export default async function WorkspaceProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  const { data: teamMember } = await serviceClient
    .from("team_members")
    .select("id, name")
    .eq("email", profile?.email ?? "")
    .maybeSingle();

  if (!teamMember) {
    return (
      <div className="p-6 md:p-8 w-full">
        <TopBar title="Projects" subtitle="Your assigned projects" />
        <div className="mt-8 rounded-2xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            No team member record found. Ask an admin to set up your account.
          </p>
        </div>
      </div>
    );
  }

  const { data: assignments } = await serviceClient
    .from("project_team_assignments")
    .select("id, role_on_project, team_notes, project_id, projects(id, name, status, service_type, description, start_date, client_id, shoot_location, call_time, access_notes, mood_board_url, internal_brief)")
    .eq("team_member_id", teamMember.id)
    .order("created_at", { ascending: false });

  const projectIds = (assignments ?? []).map((a: any) => a.project_id).filter(Boolean);

  const [{ data: deliverables }, { data: events }, { data: proposals }] = await Promise.all([
    projectIds.length > 0
      ? serviceClient.from("deliverables").select("id, project_id, title, description, due_date, agency_approved, client_approved, category").in("project_id", projectIds).order("sort_order")
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? serviceClient.from("calendar_events").select("id, project_id, title, start_date, type, notes, color").in("project_id", projectIds).gte("start_date", new Date().toISOString()).lte("start_date", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()).order("start_date", { ascending: true })
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? serviceClient.from("proposals").select("id, project_id, title, content, status").in("project_id", projectIds).in("status", ["sent", "accepted"]).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const scopeByProject: Record<string, { proposalTitle: string; sections: { heading: string; body: string }[] }> = {};
  for (const proposal of (proposals ?? [])) {
    const pid = (proposal as any).project_id;
    if (scopeByProject[pid]) continue;
    const sections = extractScopeSection((proposal as any).content ?? []);
    if (sections.length > 0) scopeByProject[pid] = { proposalTitle: (proposal as any).title, sections };
  }

  const clientIds = [...new Set((assignments ?? []).map((a: any) => a.projects?.client_id).filter(Boolean))];
  const { data: clients } = clientIds.length > 0
    ? await serviceClient.from("profiles").select("id, full_name, business_name").in("id", clientIds)
    : { data: [] };

  const clientMap: Record<string, { full_name: string; business_name: string | null }> = {};
  for (const c of (clients ?? [])) clientMap[(c as any).id] = c as any;

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Projects" subtitle="Your assigned projects" />
      <div className="mt-8">
        <WorkspaceProjectsClient
          assignments={(assignments ?? []) as any[]}
          deliverables={deliverables ?? []}
          events={events ?? []}
          scopeByProject={scopeByProject}
          clientMap={clientMap}
        />
      </div>
    </div>
  );
}
