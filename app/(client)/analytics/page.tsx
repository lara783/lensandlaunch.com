import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import AnalyticsClient from "./AnalyticsClient";

export default async function ClientAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("analytics_enabled")
    .eq("id", user.id)
    .single();

  // Gate: if not enabled, redirect to dashboard
  if (!(profile as any)?.analytics_enabled) redirect("/dashboard");

  const { data: analytics } = await (supabase as any)
    .from("content_analytics")
    .select("*")
    .eq("client_id", user.id)
    .order("period_start", { ascending: false });

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Analytics" subtitle="Your content performance across platforms." />
      <div className="mt-8">
        <AnalyticsClient analytics={analytics ?? []} />
      </div>
    </div>
  );
}
