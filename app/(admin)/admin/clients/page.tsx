import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";
import NewClientButton from "./NewClientButton";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("*, projects(id, name, status)")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Clients" subtitle={`${clients?.length ?? 0} total clients`} />

      <div className="mt-8 flex justify-end mb-6">
        <NewClientButton />
      </div>

      <div className="space-y-3">
        {clients?.map((client) => {
          const activeProjects = (client.projects as { status: string }[])?.filter((p) => p.status === "active") ?? [];
          return (
            <Link key={client.id} href={`/admin/clients/${client.id}`}>
              <div
                className="flex items-center justify-between px-6 py-4 rounded-2xl transition-all"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                  >
                    {(client.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                      {client.full_name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      {client.email}
                      {client.business_name && ` · ${client.business_name}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {activeProjects.length > 0 ? (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: "rgba(156,132,122,0.15)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                    >
                      {activeProjects.length} active project{activeProjects.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No active projects</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
