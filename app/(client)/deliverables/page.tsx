import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import DeliverableListClient from "./DeliverableListClient";

export default async function DeliverablesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", user.id)
    .eq("status", "active")
    .limit(1);

  const project = projects?.[0] ?? null;

  const { data: deliverables } = project
    ? await supabase
        .from("deliverables")
        .select("*")
        .eq("project_id", project.id)
        .order("sort_order")
    : { data: [] };

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Deliverables"
        subtitle={project ? `Project: ${project.name}` : "No active project"}
      />
      <div className="mt-8">
        <DeliverableListClient
          initialDeliverables={deliverables ?? []}
          projectId={project?.id ?? null}
          userId={user.id}
        />
      </div>
    </div>
  );
}
