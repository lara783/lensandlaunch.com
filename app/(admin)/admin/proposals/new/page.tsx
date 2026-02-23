import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import ProposalBuilderClient from "./ProposalBuilderClient";

export default async function NewProposalPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: drafts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, business_name, email")
      .eq("role", "client")
      .order("full_name"),
    (supabase as any)
      .from("proposals")
      .select("id, title, status, created_at, client_id, profiles(full_name)")
      .in("status", ["draft", "sent"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="New Proposal" subtitle="Build, preview, and send a proposal to a client." />
      <div className="mt-8">
        <ProposalBuilderClient clients={clients ?? []} savedProposals={drafts ?? []} />
      </div>
    </div>
  );
}
