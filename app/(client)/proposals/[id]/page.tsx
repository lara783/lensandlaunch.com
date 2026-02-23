import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProposalViewClient from "./ProposalViewClient";

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .eq("client_id", user.id)
    .single();

  if (!proposal) notFound();

  return <ProposalViewClient proposal={proposal} />;
}
