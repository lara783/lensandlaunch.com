import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  upsertContact,
  createDeal,
  updateDealStage,
  attachPdfToDeal,
  DEAL_STAGES,
} from "@/lib/hubspot";

// POST /api/hubspot/sync
// Body: { proposalId, action: 'sent' | 'accepted' | 'declined' | 'pdf_ready', pdfUrl? }

export async function POST(req: Request) {
  if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    return NextResponse.json({ skipped: "HUBSPOT_PRIVATE_APP_TOKEN not configured" });
  }

  const { proposalId, action, pdfUrl } = await req.json();
  if (!proposalId || !action) {
    return NextResponse.json({ error: "Missing proposalId or action" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: proposal } = await (supabase as any)
    .from("proposals")
    .select("id, title, client_id, hubspot_deal_id, profiles:client_id(full_name, email, business_name, hubspot_contact_id)")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const profile = proposal.profiles;
  const email = profile?.email;
  if (!email) {
    return NextResponse.json({ error: "Client has no email" }, { status: 400 });
  }

  // ── Sent: create contact + deal ───────────────────────────────────────────
  if (action === "sent") {
    // Upsert contact
    let contactId = profile.hubspot_contact_id as string | null;
    if (!contactId) {
      contactId = await upsertContact({
        email,
        firstName: profile.full_name ?? "",
        company: profile.business_name ?? "",
      });
      if (contactId) {
        await (supabase as any)
          .from("profiles")
          .update({ hubspot_contact_id: contactId })
          .eq("id", proposal.client_id);
      }
    }

    if (!contactId) {
      return NextResponse.json({ error: "Failed to create/find HubSpot contact" }, { status: 500 });
    }

    // Create deal
    const dealId = await createDeal({
      name: proposal.title,
      contactId,
      stage: DEAL_STAGES.proposalSent,
    });

    if (dealId) {
      await (supabase as any)
        .from("proposals")
        .update({ hubspot_deal_id: dealId })
        .eq("id", proposalId);
    }

    return NextResponse.json({ ok: true, contactId, dealId });
  }

  // ── Accepted: update deal stage ───────────────────────────────────────────
  if (action === "accepted") {
    const dealId = proposal.hubspot_deal_id as string | null;
    if (!dealId) return NextResponse.json({ skipped: "No deal ID stored" });
    const ok = await updateDealStage(dealId, DEAL_STAGES.closedWon);
    return NextResponse.json({ ok });
  }

  // ── Declined: update deal stage ───────────────────────────────────────────
  if (action === "declined") {
    const dealId = proposal.hubspot_deal_id as string | null;
    if (!dealId) return NextResponse.json({ skipped: "No deal ID stored" });
    const ok = await updateDealStage(dealId, DEAL_STAGES.closedLost);
    return NextResponse.json({ ok });
  }

  // ── PDF ready: attach note to deal ────────────────────────────────────────
  if (action === "pdf_ready" && pdfUrl) {
    const dealId = proposal.hubspot_deal_id as string | null;
    if (!dealId) return NextResponse.json({ skipped: "No deal ID stored" });
    const ok = await attachPdfToDeal({
      dealId,
      noteBody: `Proposal PDF generated: ${proposal.title}`,
      pdfUrl,
    });
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
