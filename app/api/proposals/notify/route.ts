import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { proposalId } = await req.json();
  if (!proposalId) {
    return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[notify] RESEND_API_KEY not set — email skipped.");
    return NextResponse.json({ warning: "Email not sent — RESEND_API_KEY not configured." });
  }

  // Fetch proposal + client details
  const supabase = await createClient();
  const { data: proposal } = await (supabase as any)
    .from("proposals")
    .select("id, title, profiles(full_name, email)")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const clientEmail: string = proposal.profiles?.email ?? "";
  const clientName: string = proposal.profiles?.full_name ?? "there";
  const firstName = clientName.split(" ")[0];
  const proposalTitle: string = proposal.title ?? "Your Proposal";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";
  const proposalLink = `${appUrl}/proposals/${proposalId}`;

  if (!clientEmail) {
    return NextResponse.json({ error: "Client has no email on file" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "Lara — Lens & Launch <lara@lensandlaunch.com>",
    to: clientEmail,
    subject: `Your proposal is ready — ${proposalTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f5f2ef;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ef;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9c847a;font-weight:700;">
                LENS &amp; LAUNCH MEDIA
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#010101;line-height:1.2;">
                Hi ${firstName},
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#727070;line-height:1.6;">
                Lara has sent you a proposal. Take a look when you're ready — you can review it, ask questions, and sign directly in your client portal.
              </p>

              <!-- Proposal title pill -->
              <div style="background:#f5f2ef;border-radius:10px;padding:16px 20px;margin-bottom:28px;border-left:3px solid #9c847a;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9c847a;font-weight:700;margin-bottom:4px;">Proposal</p>
                <p style="margin:0;font-size:16px;font-weight:600;color:#010101;">${proposalTitle}</p>
              </div>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${proposalLink}"
                      style="display:inline-block;background:#010101;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
                      View &amp; Sign Proposal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#aba696;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${proposalLink}" style="color:#9c847a;">${proposalLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#aba696;">
                Lens &amp; Launch Media · Sunshine Coast, Australia · lensandlaunch.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[notify] Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to HubSpot (fire-and-forget — don't block the response)
  const hubSyncBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";
  fetch(`${hubSyncBase}/api/hubspot/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposalId, action: "sent" }),
  }).catch((err) => console.warn("[notify] HubSpot sync skipped:", err));

  return NextResponse.json({ ok: true, sentTo: clientEmail });
}
