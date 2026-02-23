import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProposalViewClient from "@/app/(client)/proposals/[id]/ProposalViewClient";

export default async function AdminProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, profiles(full_name, email)")
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  return (
    <ProposalViewClient
      proposal={proposal as any}
      adminNav={{
        proposalId: id,
        canEdit: proposal.status === "draft" || proposal.status === "sent",
      }}
    />
  );
}
