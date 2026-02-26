import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Called when a retainer proposal is accepted.
// Schedules 12 monthly reminders (strategy, creative direction, analytics) starting 30 days from now.

const RETAINER_MEETING_TYPES = ["strategy", "creative_direction", "analytics"] as const;
const MONTHS_AHEAD = 12;

export async function POST(req: Request) {
  const { proposalId } = await req.json();
  if (!proposalId) {
    return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch proposal + client + linked project
  const { data: proposal } = await (supabase as any)
    .from("proposals")
    .select("id, client_id, project_id, title, status, profiles(full_name, email)")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Only schedule for accepted proposals
  if (proposal.status !== "accepted") {
    return NextResponse.json({ skipped: "Proposal not accepted" });
  }

  // Check if project is a retainer
  let isRetainer = false;
  if (proposal.project_id) {
    const { data: project } = await (supabase as any)
      .from("projects")
      .select("service_type")
      .eq("id", proposal.project_id)
      .single();
    isRetainer = project?.service_type === "retainer";
  } else {
    // If no project, check title for retainer keywords
    isRetainer = /retainer/i.test(proposal.title ?? "");
  }

  if (!isRetainer) {
    return NextResponse.json({ skipped: "Not a retainer package" });
  }

  // Delete any existing pending reminders for this client to avoid duplicates
  await (supabase as any)
    .from("scheduled_emails")
    .delete()
    .eq("client_id", proposal.client_id)
    .eq("type", "retainer_booking_reminder")
    .eq("sent", false);

  // Build reminder rows — cycle through meeting types each month
  const rows: any[] = [];
  const base = new Date();

  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const sendAt = new Date(base);
    sendAt.setDate(sendAt.getDate() + 30 + i * 30); // ~monthly spacing
    sendAt.setHours(9, 0, 0, 0); // 9am local

    const meetingType = RETAINER_MEETING_TYPES[i % RETAINER_MEETING_TYPES.length];
    rows.push({
      client_id: proposal.client_id,
      type: "retainer_booking_reminder",
      meeting_type: meetingType,
      send_at: sendAt.toISOString(),
    });
  }

  const { error } = await (supabase as any).from("scheduled_emails").insert(rows);
  if (error) {
    console.error("[schedule-reminders] Insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scheduled: rows.length });
}
