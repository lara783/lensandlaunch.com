import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import BrandKitClient from "./BrandKitClient";

export default async function BrandKitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: brandKit }, { data: assets }] = await Promise.all([
    (supabase as any).from("brand_kits").select("*").eq("client_id", user.id).single(),
    (supabase as any).from("client_assets").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Brand Kit" subtitle="Your colours, fonts, and visual identity." />
      <div className="mt-8 max-w-3xl">
        <BrandKitClient
          clientId={user.id}
          initial={brandKit ?? null}
          initialAssets={assets ?? []}
        />
      </div>
    </div>
  );
}
