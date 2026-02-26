import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

// Vercel Cron: runs daily at 9am AEST (23:00 UTC).
// Sends any pending scheduled_emails where send_at <= now.

const MEETING_LABELS: Record<string, string> = {
  strategy: "Monthly Strategy Meeting",
  creative_direction: "Creative Direction Session",
  analytics: "Analytics & Performance Review",
};

export async function GET(req: Request) {
  // Protect cron endpoint — Vercel sets this header automatically
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ warning: "RESEND_API_KEY not set — reminders skipped." });
  }

  const supabase = await createClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";
  const hubspotUrl = process.env.NEXT_PUBLIC_HUBSPOT_MEETING_URL ?? `${appUrl}/schedule`;

  // Fetch due reminders (not yet sent, send_at in the past)
  const { data: pending, error: fetchError } = await (supabase as any)
    .from("scheduled_emails")
    .select("*, profiles:client_id(full_name, email)")
    .eq("sent", false)
    .lte("send_at", new Date().toISOString())
    .limit(50);

  if (fetchError) {
    console.error("[cron/send-reminders] Fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const results: { id: string; ok: boolean }[] = [];

  for (const reminder of pending) {
    const clientEmail = reminder.profiles?.email;
    const clientName = reminder.profiles?.full_name ?? "there";
    const firstName = clientName.split(" ")[0];
    const meetingLabel = MEETING_LABELS[reminder.meeting_type ?? "strategy"] ?? "Monthly Meeting";

    if (!clientEmail) {
      results.push({ id: reminder.id, ok: false });
      continue;
    }

    const { error: sendError } = await resend.emails.send({
      from: "Lara — Lens & Launch <lara@lensandlaunch.com>",
      to: clientEmail,
      subject: `Time to book your ${meetingLabel} 📅`,
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

          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9c847a;font-weight:700;">
                LENS &amp; LAUNCH MEDIA
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#010101;line-height:1.2;">
                Hi ${firstName},
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#727070;line-height:1.6;">
                It&apos;s time to book your <strong>${meetingLabel}</strong> for this month. These sessions keep your content strategy on track and make sure everything is aligned.
              </p>

              <div style="background:#f5f2ef;border-radius:10px;padding:16px 20px;margin-bottom:28px;border-left:3px solid #9c847a;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9c847a;font-weight:700;margin-bottom:4px;">This month</p>
                <p style="margin:0;font-size:16px;font-weight:600;color:#010101;">${meetingLabel}</p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${hubspotUrl}"
                      style="display:inline-block;background:#010101;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
                      Book your session →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#aba696;line-height:1.5;">
                Or copy this link: <a href="${hubspotUrl}" style="color:#9c847a;">${hubspotUrl}</a>
              </p>
            </td>
          </tr>

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

    if (!sendError) {
      // Mark as sent
      await (supabase as any)
        .from("scheduled_emails")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", reminder.id);
      results.push({ id: reminder.id, ok: true });
    } else {
      console.error(`[cron] Failed to send reminder ${reminder.id}:`, sendError);
      results.push({ id: reminder.id, ok: false });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, sent, total: pending.length });
}
