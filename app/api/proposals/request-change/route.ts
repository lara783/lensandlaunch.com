import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

// POST /api/proposals/request-change
// Called when a client submits a change request on a proposal.
// Emails Lara with the client's feedback.
export async function POST(req: Request) {
  const body = await req.json();
  const { proposalId, changeRequest } = body;

  if (!proposalId || !changeRequest?.trim()) {
    return NextResponse.json({ error: "Missing proposalId or changeRequest" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[request-change] RESEND_API_KEY not set — email skipped.");
    return NextResponse.json({ warning: "Email not sent — RESEND_API_KEY not configured." });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch proposal title
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, title")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Fetch client profile separately — avoids Supabase join type ambiguity
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name")
    .eq("id", user.id)
    .single();

  const clientName = profile?.full_name ?? "A client";
  const businessName = profile?.business_name ?? null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Lens & Launch Portal <lara@lensandlaunch.com>",
    to: "lara@lensandlaunch.com",
    subject: `📝 Change request — ${proposal.title}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #010101;">
        <div style="border-bottom: 2px solid #9c847a; padding-bottom: 20px; margin-bottom: 28px;">
          <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9c847a; margin: 0 0 6px;">Lens &amp; Launch Portal</p>
          <h1 style="font-size: 22px; margin: 0; font-weight: 700;">Change Request</h1>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr>
            <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9c847a; padding: 8px 0; border-bottom: 1px solid #ede8e4; width: 120px;">Client</td>
            <td style="font-size: 14px; padding: 8px 0; border-bottom: 1px solid #ede8e4;">${clientName}${businessName ? ` — ${businessName}` : ""}</td>
          </tr>
          <tr>
            <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9c847a; padding: 8px 0; border-bottom: 1px solid #ede8e4;">Proposal</td>
            <td style="font-size: 14px; padding: 8px 0; border-bottom: 1px solid #ede8e4;">${proposal.title}</td>
          </tr>
        </table>

        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9c847a; margin: 0 0 10px;">Their request</p>
        <div style="background: #ede8e4; border-left: 3px solid #9c847a; padding: 16px 20px; font-size: 15px; line-height: 1.65; color: #010101; border-radius: 0 8px 8px 0;">
          ${changeRequest.trim().replace(/\n/g, "<br>")}
        </div>

        <div style="margin-top: 32px;">
          <a href="${appUrl}/admin/proposals" style="display: inline-block; background: #010101; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 8px;">
            View in Admin →
          </a>
        </div>

        <p style="font-size: 11px; color: #aba696; margin-top: 32px; border-top: 1px solid #d9d9d9; padding-top: 16px;">
          Lens &amp; Launch Portal · lensandlaunch.com
        </p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
