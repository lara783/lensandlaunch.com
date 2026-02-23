import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, title, status, created_at, sent_at")
    .eq("client_id", user.id)
    .not("status", "eq", "draft") // clients only see sent/accepted/declined
    .order("created_at", { ascending: false });

  const statusStyle: Record<string, React.CSSProperties> = {
    sent:     { background: "rgba(156,132,122,0.12)", color: "#9c847a" },
    accepted: { background: "rgba(39,103,73,0.12)",  color: "#276749" },
    declined: { background: "rgba(197,48,48,0.1)",   color: "#c53030" },
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-2xl">
      <TopBar title="Proposals" subtitle="Proposals sent to you by Lens & Launch." />

      <div className="mt-8 space-y-3">
        {(!proposals || proposals.length === 0) && (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <FileText size={32} style={{ color: "var(--ll-taupe)", opacity: 0.4, marginBottom: 12 }} />
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              No proposals yet.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)", opacity: 0.6 }}>
              We&apos;ll send you a notification when your first one arrives.
            </p>
          </div>
        )}

        {proposals?.map((p) => {
          const style = statusStyle[p.status] ?? statusStyle.sent;
          return (
            <Link key={p.id} href={`/proposals/${p.id}`}>
              <div
                className="flex items-center justify-between px-5 py-4 rounded-2xl group transition-all hover:scale-[1.01]"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(156,132,122,0.1)" }}
                  >
                    <FileText size={16} style={{ color: "var(--ll-taupe)" }} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                    >
                      {p.title}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                    >
                      {p.sent_at
                        ? new Date(p.sent_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                        : new Date(p.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={style}
                  >
                    {p.status}
                  </span>
                  <ChevronRight size={14} style={{ color: "var(--ll-grey)", opacity: 0.5 }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
