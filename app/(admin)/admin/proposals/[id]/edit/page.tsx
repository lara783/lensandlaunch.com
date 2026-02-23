import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProposalBuilderClient from "@/app/(admin)/admin/proposals/new/ProposalBuilderClient";

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: clients }] = await Promise.all([
    (supabase as any).from("proposals").select("*").eq("id", id).single(),
    supabase.from("profiles").select("id, full_name, business_name, email").eq("role", "client").order("full_name"),
  ]);

  if (!proposal) notFound();

  // Pre-load the client's projects so the project selector is populated
  const { data: initialProjects } = await (supabase as any)
    .from("projects")
    .select("id, name, status")
    .eq("client_id", proposal.client_id)
    .order("created_at", { ascending: false });

  // Also load all saved proposals for the sidebar
  const { data: savedProposals } = await (supabase as any)
    .from("proposals")
    .select("id, title, status, created_at, client_id, profiles(full_name)")
    .in("status", ["draft", "sent"])
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Edit Proposal" subtitle={proposal.title} />
      <div className="mt-4 mb-6">
        <Link
          href={`/admin/proposals/${id}`}
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
        >
          ← Back to proposal
        </Link>
      </div>
      <ProposalBuilderClient
        clients={clients ?? []}
        savedProposals={savedProposals ?? []}
        editProposal={proposal}
        initialProjects={initialProjects ?? []}
      />
    </div>
  );
}
