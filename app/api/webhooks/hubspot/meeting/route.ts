import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST /api/webhooks/hubspot/meeting
 *
 * Called by a HubSpot Workflow when a meeting is booked.
 * Protected by x-hubspot-secret header (set in HUBSPOT_WEBHOOK_SECRET env var).
 *
 * Expected body (sent by HubSpot workflow):
 *   {
 *     contactEmail: string,       // contact's email address
 *     meetingTitle: string,       // meeting name / title
 *     meetingDate: string,        // ISO 8601 datetime e.g. "2026-03-15T10:00:00Z"
 *     meetingType?: string        // optional: "creative_direction" | "strategy" | etc.
 *   }
 *
 * HubSpot Workflow setup (one-time, manual):
 *   1. HubSpot → Automation → Workflows → trigger: Meeting outcome / Meeting booked
 *   2. Action: Webhook → POST https://portal.lensandlaunch.com/api/webhooks/hubspot/meeting
 *   3. Header: x-hubspot-secret: <value of HUBSPOT_WEBHOOK_SECRET env var>
 *   4. Body (JSON): { "contactEmail": "{{contact.email}}", "meetingTitle": "{{meeting.title}}", "meetingDate": "{{meeting.startTime}}" }
 */

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get("x-hubspot-secret");
  if (!process.env.HUBSPOT_WEBHOOK_SECRET || secret !== process.env.HUBSPOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { contactEmail?: string; meetingTitle?: string; meetingDate?: string; meetingType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contactEmail, meetingTitle, meetingDate, meetingType } = body;
  if (!contactEmail || !meetingDate) {
    return NextResponse.json({ error: "Missing contactEmail or meetingDate" }, { status: 400 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Find client profile by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", contactEmail.toLowerCase().trim())
    .eq("role", "client")
    .single();

  if (!profile) {
    // Not a portal client — ignore gracefully
    return NextResponse.json({ ok: true, skipped: "No matching client" });
  }

  // Find their most recent active project
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ ok: true, skipped: "No active project for client" });
  }

  const startDate = new Date(meetingDate).toISOString();
  const title = meetingTitle?.trim() || "Meeting";

  // Map meetingType to portal event type
  const eventType = (() => {
    const t = (meetingType ?? "").toLowerCase();
    if (t.includes("shoot")) return "shoot";
    if (t.includes("review")) return "review";
    if (t.includes("strategy") || t.includes("creative")) return "meeting";
    return "meeting";
  })();

  const { error } = await supabase.from("calendar_events").insert({
    project_id: project.id,
    title,
    start_date: startDate,
    end_date: null,
    type: eventType,
    notes: `Booked via HubSpot`,
    color: "#696348",
  });

  if (error) {
    console.error("HubSpot webhook — calendar insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
