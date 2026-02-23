import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: recentProposals }, { data: activeProjects }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("role", "client").order("created_at", { ascending: false }),
      supabase.from("proposals").select("*, profiles(full_name, business_name)").order("created_at", { ascending: false }).limit(5),
      supabase.from("projects").select("*, profiles(full_name)").eq("status", "active").order("created_at", { ascending: false }),
    ]);

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  };

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Admin Overview" subtitle="Lens & Launch Media — portal management" />

      <div className="mt-8 grid grid-cols-3 gap-4">
        <div style={cardStyle}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Clients</p>
          <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-body)", color: "var(--foreground)" }}>{clients?.length ?? 0}</p>
        </div>
        <div style={cardStyle}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Active Projects</p>
          <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-body)", color: "var(--foreground)" }}>{activeProjects?.length ?? 0}</p>
        </div>
        <div style={cardStyle}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Proposals Sent</p>
          <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-body)", color: "var(--foreground)" }}>
            {recentProposals?.filter((p) => p.status !== "draft").length ?? 0}
          </p>
        </div>
      </div>

      {/* Recent proposals */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Recent Proposals
          </p>
          <Link href="/admin/proposals/new" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
            + New proposal
          </Link>
        </div>
        <div className="ll-rule mb-4" />
        <div className="space-y-2">
          {recentProposals?.map((p) => (
            <Link key={p.id} href={`/admin/proposals/${p.id}`}>
              <div
                className="flex items-center justify-between px-5 py-3 rounded-xl transition-all"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <div>
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{p.title}</span>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span className="text-xs ml-3" style={{ color: "var(--ll-grey)" }}>{(p as any).profiles?.full_name}</span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: p.status === "accepted" ? "rgba(72,187,120,0.12)" : p.status === "sent" ? "rgba(156,132,122,0.15)" : "rgba(217,217,217,0.3)",
                    color: p.status === "accepted" ? "#276749" : p.status === "sent" ? "var(--ll-taupe)" : "var(--ll-grey)",
                    fontWeight: 600,
                  }}
                >
                  {p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Client list */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Clients
          </p>
          <Link href="/admin/clients" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
            Manage all →
          </Link>
        </div>
        <div className="ll-rule mb-4" />
        <div className="space-y-2">
          {clients?.slice(0, 5).map((c) => (
            <Link key={c.id} href={`/admin/clients/${c.id}`}>
              <div
                className="flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                >
                  {(c.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{c.full_name}</p>
                  {c.business_name && <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{c.business_name}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
