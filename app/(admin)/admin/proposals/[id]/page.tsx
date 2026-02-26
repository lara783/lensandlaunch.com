import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProposalViewClient from "@/app/(client)/proposals/[id]/ProposalViewClient";

export default async function AdminProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proposal }, { data: { user } }] = await Promise.all([
    supabase.from("proposals").select("*, profiles(full_name, email)").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  if (!proposal) notFound();

  const { data: adminProfile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  return (
    <ProposalViewClient
      proposal={proposal as any}
      adminNav={{
        proposalId: id,
        canEdit: proposal.status === "draft" || proposal.status === "sent",
        adminName: adminProfile?.full_name ?? "Admin",
      }}
    />
  );
}
