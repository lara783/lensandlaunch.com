import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import ServicesClient from "./ServicesClient";

export default async function ServicesPage() {
  const supabase = await createClient();

  const [{ data: services }, { data: cogsItems }] = await Promise.all([
    (supabase as any).from("services").select("*").order("sort_order"),
    (supabase as any).from("cogs_items").select("*").order("sort_order"),
  ]);

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Services & Pricing"
        subtitle="Your rate card — used as context when writing proposals with AI."
      />
      <div className="mt-8">
        <ServicesClient
          initialServices={services ?? []}
          cogsItems={cogsItems ?? []}
          cogsBase={300}
        />
      </div>
    </div>
  );
}
