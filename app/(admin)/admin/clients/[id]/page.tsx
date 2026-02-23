import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { notFound } from "next/navigation";
import ClientDetailClient from "./ClientDetailClient";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: client },
    { data: projects },
    { data: invoices },
    { data: proposals },
    { data: documents },
    { data: brandKit },
    { data: clientAssets },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("proposals").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    (supabase as any).from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    (supabase as any).from("brand_kits").select("*").eq("client_id", id).single(),
    (supabase as any).from("client_assets").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);

  if (!client) notFound();

  const activeProject = projects?.find((p: any) => p.status === "active") ?? null;

  const [{ data: deliverables }, { data: calendarEvents }] = await Promise.all([
    activeProject
      ? supabase.from("deliverables").select("*").eq("project_id", activeProject.id).order("sort_order")
      : Promise.resolve({ data: [] }),
    activeProject
      ? (supabase as any).from("calendar_events").select("*").eq("project_id", activeProject.id).order("start_date")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title={client.full_name} subtitle={client.business_name ?? client.email} />
      <div className="mt-8">
        <ClientDetailClient
          client={client}
          projects={projects ?? []}
          invoices={invoices ?? []}
          proposals={proposals ?? []}
          deliverables={deliverables ?? []}
          documents={documents ?? []}
          calendarEvents={calendarEvents ?? []}
          brandKit={brandKit ?? null}
          clientAssets={clientAssets ?? []}
          activeProjectId={activeProject?.id ?? null}
        />
      </div>
    </div>
  );
}
