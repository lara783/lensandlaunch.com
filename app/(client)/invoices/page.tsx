import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import InvoicesClient from "./InvoicesClient";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Invoices" subtitle="Your billing history with Lens & Launch Media." />
      <div className="mt-8">
        <InvoicesClient invoices={invoices ?? []} />
      </div>
    </div>
  );
}
