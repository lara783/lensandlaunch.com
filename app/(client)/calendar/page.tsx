import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", user.id)
    .eq("status", "active")
    .limit(1);

  const projectId = projects?.[0]?.id ?? null;

  const { data: events } = projectId
    ? await supabase
        .from("calendar_events")
        .select("*")
        .eq("project_id", projectId)
    : { data: [] };

  const { data: deliverables } = projectId
    ? await supabase
        .from("deliverables")
        .select("*")
        .eq("project_id", projectId)
        .not("due_date", "is", null)
    : { data: [] };

  // Merge deliverable due dates as calendar events
  const deliverableEvents = (deliverables ?? []).map((d) => ({
    id: `del-${d.id}`,
    title: d.title,
    start: d.due_date!,
    color: "#9c847a",
    extendedProps: { type: "deliverable" },
  }));

  const calEvents = [
    ...(events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start_date,
      end: e.end_date ?? undefined,
      color: e.color ?? typeColor(e.type),
      extendedProps: { type: e.type, notes: e.notes },
    })),
    ...deliverableEvents,
  ];

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Calendar" subtitle="Your project schedule and key dates." />
      <div className="mt-8">
        <CalendarClient events={calEvents} />
      </div>
    </div>
  );
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    shoot:   "#9c847a",
    edit:    "#aba696",
    review:  "#c2ba9b",
    publish: "#010101",
    meeting: "#696348",
  };
  return map[type] ?? "#9c847a";
}
