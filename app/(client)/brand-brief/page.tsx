import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import BrandBriefClient from "@/app/(client)/onboarding/brand-brief/BrandBriefClient";

export default async function BrandBriefPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await (supabase as any)
    .from("onboarding_briefs")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle();

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Brand Brief"
        subtitle="Update your brand details anytime — Lara will be notified of changes."
      />
      <div className="mt-8">
        <BrandBriefClient existing={existing} redirectTo={null} />
      </div>
    </div>
  );
}
