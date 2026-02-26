import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/layout/TopBar";
import WorkspaceClientsClient from "./WorkspaceClientsClient";

export default async function WorkspaceClientsPage() {
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
    .select("id")
    .eq("email", profile?.email ?? "")
    .maybeSingle();

  if (!teamMember) {
    return (
      <div className="p-6 md:p-8 w-full">
        <TopBar title="Clients" subtitle="Your client directory" />
        <div className="mt-8 rounded-2xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            No team member record found.
          </p>
        </div>
      </div>
    );
  }

  // Get team member's assigned projects → then get the clients
  const { data: assignments } = await serviceClient
    .from("project_team_assignments")
    .select("project_id, projects(id, name, status, client_id, service_type)")
    .eq("team_member_id", teamMember.id);

  const clientIds = [...new Set(
    (assignments ?? []).map((a: any) => a.projects?.client_id).filter(Boolean)
  )];

  const { data: clients } = clientIds.length > 0
    ? await serviceClient
        .from("profiles")
        .select("id, full_name, business_name, email")
        .in("id", clientIds)
    : { data: [] };

  // Map projects per client
  const projectsByClient: Record<string, any[]> = {};
  for (const a of (assignments ?? [])) {
    const cid = (a as any).projects?.client_id;
    if (!cid) continue;
    if (!projectsByClient[cid]) projectsByClient[cid] = [];
    projectsByClient[cid].push((a as any).projects);
  }

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Clients" subtitle="Your client directory" />
      <div className="mt-8">
        <WorkspaceClientsClient
          clients={clients ?? []}
          projectsByClient={projectsByClient}
        />
      </div>
    </div>
  );
}
