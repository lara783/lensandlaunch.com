import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const BOARD_ID = "6a0eb1b0d658140411151575";
const DONE_LIST = "Done ✓";
const TOGGL_WORKSPACE = 21405262;

// Card name (partial, lowercase) → Toggl project ID
// Update this when projects are added/removed from the registry
const CARD_TOGGL_MAP = [
  { pattern: "nm documentary",  projectId: 220052416 },
  { pattern: "sally",           projectId: 220052417 },
  { pattern: "ryano",           projectId: 220052418 },
  // Get Synergy tracked via Clockify — no Toggl project
  { pattern: "l&b content",     projectId: 220052419 },
  { pattern: "l&l content",     projectId: 220052068 },
  { pattern: "the frame",       projectId: 220052420 },
];

// Trello sends HEAD to verify the endpoint before activating the webhook
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify request origin — HMAC-SHA1 of (body + callbackURL) signed with TRELLO_APP_SECRET
  const appSecret = process.env.TRELLO_APP_SECRET;
  const callbackUrl = process.env.TRELLO_WEBHOOK_URL;
  const signature = req.headers.get("x-trello-webhook");

  if (appSecret && callbackUrl && signature) {
    const expected = crypto
      .createHmac("sha1", appSecret)
      .update(rawBody + callbackUrl)
      .digest("base64");
    if (signature !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: {
    action?: {
      type?: string;
      data?: {
        card?: { name?: string; id?: string };
        listAfter?: { name?: string };
        listBefore?: { name?: string };
        board?: { id?: string };
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = payload?.action;
  if (!action) return NextResponse.json({ ok: true });

  // Confirm this event is for our board
  const boardId = action.data?.board?.id;
  if (boardId && boardId !== BOARD_ID) {
    return NextResponse.json({ ok: true, skipped: "Wrong board" });
  }

  // Only care about card moves
  if (action.type !== "updateCard" || !action.data?.listAfter) {
    return NextResponse.json({ ok: true });
  }

  const listAfter = action.data.listAfter?.name ?? "";
  const cardName = action.data.card?.name ?? "";

  if (listAfter !== DONE_LIST) {
    return NextResponse.json({ ok: true });
  }

  // Card moved to Done ✓ — stop matching Toggl timer
  const togglToken = process.env.TOGGL_TOKEN;
  if (!togglToken) return NextResponse.json({ ok: true, note: "No TOGGL_TOKEN configured" });

  const auth = Buffer.from(`${togglToken}:api_token`).toString("base64");
  const headers = { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };

  // Get current running timer
  const timerRes = await fetch("https://api.track.toggl.com/api/v9/me/time_entries/current", { headers });
  if (!timerRes.ok) return NextResponse.json({ ok: true, note: "Toggl timer fetch failed" });

  const timer = await timerRes.json();
  if (!timer?.id) return NextResponse.json({ ok: true, note: "No timer running" });

  // Check if running timer matches the done card's project
  const cardLower = cardName.toLowerCase();
  const match = CARD_TOGGL_MAP.find(({ pattern }) => cardLower.includes(pattern));
  if (match && timer.project_id !== match.projectId) {
    return NextResponse.json({ ok: true, note: "Running timer is for a different project" });
  }

  // Stop the timer
  const stopRes = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${TOGGL_WORKSPACE}/time_entries/${timer.id}/stop`,
    { method: "PATCH", headers }
  );

  if (!stopRes.ok) {
    return NextResponse.json({ ok: true, note: "Failed to stop Toggl timer" });
  }

  return NextResponse.json({ ok: true, stopped: timer.id, card: cardName });
}
