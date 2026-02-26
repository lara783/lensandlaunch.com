import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

const styles = StyleSheet.create({
  page: { backgroundColor: "#ffffff", padding: 52, fontFamily: "Helvetica" },
  header: { marginBottom: 28, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#9c847a", borderBottomStyle: "solid" },
  logo: { fontSize: 9, letterSpacing: 2, color: "#9c847a", textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 22, color: "#010101", fontFamily: "Helvetica-Bold", marginBottom: 3 },
  meta: { fontSize: 9, color: "#727070", letterSpacing: 0.4 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#010101", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 },
  rule: { borderBottomWidth: 0.5, borderBottomColor: "#9c847a", borderBottomStyle: "solid", marginBottom: 10, opacity: 0.35 },
  question: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#010101", marginBottom: 2, marginTop: 8 },
  answer: { fontSize: 9, lineHeight: 1.6, color: "#727070" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 },
  chip: { fontSize: 8, color: "#9c847a", border: "0.5px solid #9c847a", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  footer: { position: "absolute", bottom: 36, left: 52, right: 52, borderTopWidth: 0.5, borderTopColor: "#d9d9d9", borderTopStyle: "solid", paddingTop: 8 },
  footerText: { fontSize: 7.5, color: "#aba696", textAlign: "center" },
  emptyAnswer: { fontSize: 9, color: "#c2ba9b", fontStyle: "italic" },
});

function ans(val: string | null | undefined): React.ReactElement {
  if (!val || val.trim() === "") {
    return React.createElement(Text, { style: styles.emptyAnswer }, "Not provided");
  }
  return React.createElement(Text, { style: styles.answer }, val);
}

function chips(vals: string[] | null | undefined): React.ReactElement {
  if (!vals || vals.length === 0) {
    return React.createElement(Text, { style: styles.emptyAnswer }, "Not provided");
  }
  return React.createElement(
    View,
    { style: styles.chips },
    ...vals.map((v, i) => React.createElement(Text, { key: i, style: styles.chip }, v))
  );
}

function q(question: string, answer: React.ReactElement): React.ReactElement {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: styles.question }, question),
    answer
  );
}

function section(title: string, ...questions: React.ReactElement[]): React.ReactElement {
  return React.createElement(
    View,
    { style: styles.section },
    React.createElement(Text, { style: styles.sectionTitle }, title),
    React.createElement(View, { style: styles.rule }),
    ...questions
  );
}

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json();
    if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch profile + brief
    const [{ data: profile }, { data: brief }] = await Promise.all([
      supabase.from("profiles").select("full_name, business_name").eq("id", clientId).single(),
      (supabase as any).from("onboarding_briefs").select("*").eq("client_id", clientId).single(),
    ]);

    if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });

    const clientName = profile?.full_name ?? "Client";
    const businessName = profile?.business_name ?? "";
    const submittedDate = new Date(brief.submitted_at).toLocaleDateString("en-AU", {
      day: "numeric", month: "long", year: "numeric",
    });

    // Build PDF
    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },

        // Header
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.logo }, "Lens & Launch Media"),
          React.createElement(Text, { style: styles.title }, "Brand Brief"),
          React.createElement(Text, { style: styles.meta },
            `${clientName}${businessName ? ` · ${businessName}` : ""} · Submitted ${submittedDate}`
          )
        ),

        // Section 1
        section(
          "1. About the Business",
          q("Tell us about your business in 2–3 sentences.", ans(brief.business_description)),
          q("What products or services do you offer?", ans(brief.products_services)),
          q("What sets you apart from competitors?", ans(brief.point_of_difference)),
          q("Market positioning.", ans(brief.market_position
            ? (({ budget: "Budget-friendly", "mid-range": "Mid-range", premium: "Premium", luxury: "Luxury" } as Record<string, string>)[brief.market_position] ?? brief.market_position)
            : null)),
        ),

        // Section 2
        section(
          "2. Target Audience",
          q("Describe the ideal customer.", ans(brief.ideal_customer)),
          q("Where are most customers based?", ans(brief.customer_location)),
          q("What problems do you solve for them?", ans(brief.customer_problems)),
        ),

        // Section 3
        section(
          "3. Brand Personality & Voice",
          q("Brand personality words.", chips(brief.brand_personality)),
          q("Content tone.", ans(brief.content_tone
            ? (({ "very-casual": "Very casual", conversational: "Conversational", balanced: "Balanced", professional: "Professional", formal: "Formal" } as Record<string, string>)[brief.content_tone] ?? brief.content_tone)
            : null)),
          q("Topics / content to never post about.", ans(brief.topics_to_avoid)),
          q("Inspiring accounts (inside & outside industry).", ans(brief.inspiring_accounts)),
        ),

        // Section 4
        section(
          "4. Content Preferences",
          q("Preferred content types.", chips(brief.content_types)),
          q("Desired aesthetic / vibe.", ans(brief.content_aesthetic
            ? (({ "bright-airy": "Bright & airy", "dark-moody": "Dark & moody", "bold-colourful": "Bold & colourful", "clean-minimal": "Clean & minimal", "warm-organic": "Warm & organic", "rustic-earthy": "Rustic & earthy" } as Record<string, string>)[brief.content_aesthetic] ?? brief.content_aesthetic)
            : null)),
          q("What has worked well in the past?", ans(brief.what_worked)),
        ),

        // Section 5
        section(
          "5. Goals & Priorities",
          q("Primary social media goal.", ans(brief.primary_goal
            ? (({ "brand-awareness": "Build brand awareness", "website-traffic": "Drive website traffic", leads: "Generate leads", "grow-following": "Grow following", sales: "Increase sales", community: "Build community" } as Record<string, string>)[brief.primary_goal] ?? brief.primary_goal)
            : null)),
          q("What would make this partnership a huge success?", ans(brief.success_definition)),
          q("Upcoming events, launches, or campaigns (next 3 months).", ans(brief.upcoming_events)),
        ),

        // Footer
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(Text, { style: styles.footerText },
            "Lens & Launch Media · lensandlaunch.com · Confidential"
          )
        )
      )
    );

    const buffer = await renderToBuffer(doc);

    // Send email with PDF attached
    const { error: emailError } = await resend.emails.send({
      from: "Lens & Launch Portal <lara@lensandlaunch.com>",
      to: "lara@lensandlaunch.com",
      subject: `${clientName} has completed their onboarding survey`,
      html: `
        <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; padding: 40px 32px; border-radius: 12px;">
          <p style="font-size: 10px; letter-spacing: 2px; color: #9c847a; text-transform: uppercase; margin: 0 0 24px;">Lens &amp; Launch Portal</p>
          <h1 style="font-size: 22px; color: #010101; margin: 0 0 8px;">Brand brief received</h1>
          <p style="font-size: 14px; color: #727070; margin: 0 0 28px; line-height: 1.6;">
            <strong style="color: #010101;">${clientName}</strong>${businessName ? ` from <strong style="color: #010101;">${businessName}</strong>` : ""} has completed their onboarding questionnaire.
            Their brand brief is attached as a PDF — ready for you to use when building their content strategy.
          </p>
          <div style="background: #faf9f8; border: 1px solid #ede8e4; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
            <p style="font-size: 11px; color: #9c847a; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin: 0 0 4px;">Summary</p>
            <p style="font-size: 13px; color: #010101; margin: 0;"><strong>Client:</strong> ${clientName}</p>
            ${businessName ? `<p style="font-size: 13px; color: #010101; margin: 4px 0 0;"><strong>Business:</strong> ${businessName}</p>` : ""}
            <p style="font-size: 13px; color: #010101; margin: 4px 0 0;"><strong>Submitted:</strong> ${submittedDate}</p>
          </div>
          <p style="font-size: 12px; color: #aba696; margin: 0;">Lens &amp; Launch Media · lensandlaunch.com</p>
        </div>
      `,
      attachments: [
        {
          filename: `${clientName.replace(/\s+/g, "-")}-brand-brief.pdf`,
          content: buffer,
        },
      ],
    });

    if (emailError) {
      console.error("Brief email error:", emailError);
      // Don't fail the request — brief was saved, email is best-effort
      return NextResponse.json({ success: true, emailWarning: emailError.message });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-brief error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
