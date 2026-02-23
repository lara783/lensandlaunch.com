import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { motion } from "framer-motion";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const activeProject = projects?.[0] ?? null;

  const { data: deliverables } = activeProject
    ? await supabase
        .from("deliverables")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("sort_order")
    : { data: [] };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Dashboard" />

      {/* Greeting */}
      <div className="mt-8 mb-8">
        <h2
          className="text-4xl italic mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
        >
          {greeting}, {firstName}.
        </h2>
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          Here&apos;s where things stand{activeProject ? ` on ${activeProject.name}` : ""}.
        </p>
      </div>

      {/* Stats */}
      <StatsCards
        invoices={invoices ?? []}
        deliverables={deliverables ?? []}
        projectName={activeProject?.name ?? "Your project"}
      />

      {/* Recent deliverables */}
      {deliverables && deliverables.length > 0 && (
        <div className="mt-10">
          <div className="ll-rule mb-6" />
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
          >
            Deliverables
          </p>
          <div className="space-y-2">
            {deliverables.slice(0, 5).map((d, i) => (
              <DashboardClient key={d.id} deliverable={d} index={i} />
            ))}
          </div>
          {deliverables.length > 5 && (
            <a
              href="/timeline"
              className="inline-block mt-4 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
            >
              View all {deliverables.length} deliverables →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
