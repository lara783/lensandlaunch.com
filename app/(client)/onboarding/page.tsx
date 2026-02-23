import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const [{ data: brandKit }, { data: assets }, { data: proposals }] = await Promise.all([
    (supabase as any).from("brand_kits").select("colors, fonts, logo_url").eq("client_id", user.id).single(),
    (supabase as any).from("client_assets").select("id").eq("client_id", user.id).limit(1),
    supabase.from("proposals").select("id").eq("client_id", user.id).limit(1),
  ]);

  const completionState = {
    hasBrandColors: Array.isArray(brandKit?.colors) && brandKit.colors.length > 0,
    hasBrandFonts: Array.isArray(brandKit?.fonts) && brandKit.fonts.length > 0,
    hasLogo: !!brandKit?.logo_url,
    hasAssets: Array.isArray(assets) && assets.length > 0,
    hasProposal: Array.isArray(proposals) && proposals.length > 0,
  };

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Get Started" subtitle="Everything you need to set up your portal." />
      <div className="mt-8 max-w-2xl">
        <OnboardingClient firstName={firstName} completionState={completionState} />
      </div>
    </div>
  );
}
