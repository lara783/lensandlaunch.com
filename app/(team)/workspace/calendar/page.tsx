import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/layout/TopBar";
import WorkspaceCalendarClient from "./WorkspaceCalendarClient";

export default async function WorkspaceCalendarPage() {
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
        <TopBar title="Calendar" subtitle="Your schedule" />
        <div className="mt-8 rounded-2xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            No team member record found.
          </p>
        </div>
      </div>
    );
  }

  // Get project IDs for assigned projects
  const { data: assignments } = await serviceClient
    .from("project_team_assignments")
    .select("project_id")
    .eq("team_member_id", teamMember.id);

  const projectIds = (assignments ?? []).map((a: any) => a.project_id).filter(Boolean);

  const { data: rawEvents } = projectIds.length > 0
    ? await serviceClient
        .from("calendar_events")
        .select("*")
        .in("project_id", projectIds)
        .order("start_date", { ascending: true })
    : { data: [] };

  const EVENT_COLORS: Record<string, string> = {
    shoot: "#9c847a",
    edit: "#aba696",
    review: "#c2ba9b",
    publish: "#010101",
    meeting: "#696348",
  };

  const events = (rawEvents ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    start: e.start_date,
    end: e.end_date ?? undefined,
    color: e.color ?? EVENT_COLORS[e.type] ?? "#9c847a",
    extendedProps: { type: e.type, notes: e.notes, project_id: e.project_id },
  }));

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Calendar" subtitle="Your schedule" />
      <div className="mt-8">
        <WorkspaceCalendarClient events={events} />
      </div>
    </div>
  );
}
