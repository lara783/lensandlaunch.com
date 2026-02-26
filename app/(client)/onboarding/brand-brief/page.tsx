import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import BrandBriefClient from "./BrandBriefClient";

export default async function BrandBriefPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch any existing brief to pre-fill the form
  const { data: existing } = await (supabase as any)
    .from("onboarding_briefs")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle();

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Your Brand Brief"
        subtitle="Help us understand your brand so we can create content that truly represents you."
      />
      <div className="mt-8">
        <BrandBriefClient existing={existing} />
      </div>
    </div>
  );
}
