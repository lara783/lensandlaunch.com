import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

// POST /api/proposals/signed-notify
// Called (fire-and-forget) when a client accepts a proposal.
// Generates the PDF if needed, then emails Lara with the PDF attached.
export async function POST(req: Request) {
  const body = await req.json();
  const { proposalId, clientName, clientEmail, selectedTier, signedAt } = body;

  if (!proposalId) {
    return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[signed-notify] RESEND_API_KEY not set — email skipped.");
    return NextResponse.json({ warning: "Email not sent — RESEND_API_KEY not configured." });
  }

  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, title, pdf_url")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Ensure PDF exists — generate if missing
  let pdfUrl: string | null = proposal.pdf_url ?? null;
  if (!pdfUrl) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";
      const genRes = await fetch(`${appUrl}/api/proposals/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      if (genRes.ok) {
        const genData = await genRes.json();
        pdfUrl = genData.url ?? null;
      }
    } catch (err) {
      console.warn("[signed-notify] PDF generation failed:", err);
    }
  }

  // Download PDF bytes for attachment
  let pdfAttachment: { filename: string; content: Buffer } | null = null;
  if (pdfUrl) {
    try {
      const pdfRes = await fetch(pdfUrl);
      if (pdfRes.ok) {
        const arrayBuffer = await pdfRes.arrayBuffer();
        pdfAttachment = {
          filename: `${proposal.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-proposal.pdf`,
          content: Buffer.from(arrayBuffer),
        };
      }
    } catch (err) {
      console.warn("[signed-notify] PDF download failed:", err);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";
  const adminLink = `${appUrl}/admin/proposals/${proposalId}`;

  const signedDateStr = signedAt
    ? new Date(signedAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "just now";

  const resend = new Resend(process.env.RESEND_API_KEY);

  const emailPayload: Parameters<typeof resend.emails.send>[0] = {
    from: "Lens & Launch Portal <lara@lensandlaunch.com>",
    to: "lara@lensandlaunch.com",
    subject: `✅ ${clientName ?? "A client"} accepted "${proposal.title}"`,
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9c847a;font-weight:700;">
                LENS &amp; LAUNCH PORTAL
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:36px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <!-- Icon + heading -->
              <p style="margin:0 0 4px;font-size:28px;">✅</p>
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#010101;line-height:1.25;">
                Proposal accepted
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#727070;line-height:1.6;">
                A client just accepted a proposal in the portal. The PDF is attached to this email.
              </p>

              <!-- Proposal title -->
              <div style="background:#f5f2ef;border-radius:10px;padding:14px 18px;margin-bottom:20px;border-left:3px solid #9c847a;">
                <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#9c847a;font-weight:700;margin-bottom:3px;">Proposal</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#010101;">${proposal.title}</p>
              </div>

              <!-- Client details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${clientName ? `<tr><td style="padding:4px 0;font-size:12px;color:#9c847a;width:110px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Name</td><td style="padding:4px 0;font-size:14px;color:#010101;">${clientName}</td></tr>` : ""}
                ${clientEmail ? `<tr><td style="padding:4px 0;font-size:12px;color:#9c847a;width:110px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:4px 0;font-size:14px;color:#010101;">${clientEmail}</td></tr>` : ""}
                ${selectedTier ? `<tr><td style="padding:4px 0;font-size:12px;color:#9c847a;width:110px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Package</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#010101;">${selectedTier}</td></tr>` : ""}
                <tr><td style="padding:4px 0;font-size:12px;color:#9c847a;width:110px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Accepted at</td><td style="padding:4px 0;font-size:14px;color:#010101;">${signedDateStr}</td></tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${adminLink}"
                      style="display:inline-block;background:#010101;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
                      View proposal in portal →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#aba696;">
                Lens &amp; Launch Media · portal.lensandlaunch.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };

  if (pdfAttachment) {
    (emailPayload as any).attachments = [pdfAttachment];
  }

  const { error } = await resend.emails.send(emailPayload);

  if (error) {
    console.error("[signed-notify] Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
