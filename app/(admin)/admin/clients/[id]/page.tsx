import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { notFound } from "next/navigation";
import ClientDetailClient from "./ClientDetailClient";

type MetaPage = { id: string; name: string; access_token: string; ig_account_id: string | null };

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; meta_pages?: string; meta_error?: string; meta_connected?: string; tiktok_connected?: string; tiktok_error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  let metaPages: MetaPage[] | null = null;
  if (sp.meta_pages) {
    try { metaPages = JSON.parse(Buffer.from(sp.meta_pages, "base64url").toString()); } catch {}
  }

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

  const [{ data: deliverables }, { data: calendarEvents }, { data: meetingLogs }, { data: analytics }] = await Promise.all([
    activeProject
      ? supabase.from("deliverables").select("*").eq("project_id", activeProject.id).order("sort_order")
      : Promise.resolve({ data: [] }),
    activeProject
      ? (supabase as any).from("calendar_events").select("*").eq("project_id", activeProject.id).order("start_date")
      : Promise.resolve({ data: [] }),
    (supabase as any).from("meeting_logs").select("*").eq("client_id", id).order("held_at", { ascending: false }),
    (supabase as any).from("content_analytics").select("*").eq("client_id", id).order("period_start", { ascending: false }),
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
          meetingLogs={meetingLogs ?? []}
          analytics={analytics ?? []}
          metaPages={metaPages}
          metaError={sp.meta_error ?? null}
          metaConnected={sp.meta_connected === "1"}
          tiktokConnected={sp.tiktok_connected === "1"}
          tiktokError={sp.tiktok_error ?? null}
          initialTab={sp.tab as any ?? null}
        />
      </div>
    </div>
  );
}
