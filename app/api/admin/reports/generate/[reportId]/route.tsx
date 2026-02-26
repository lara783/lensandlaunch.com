import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── PDF Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 52,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#9c847a",
    borderBottomStyle: "solid",
  },
  logoArea: {
    flex: 1,
  },
  clientLogo: {
    width: 80,
    height: 40,
    objectFit: "contain",
  },
  llLogo: {
    fontSize: 8,
    letterSpacing: 2,
    color: "#9c847a",
    textTransform: "uppercase",
    textAlign: "right",
  },
  reportTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#010101",
    marginBottom: 4,
  },
  reportMeta: {
    fontSize: 9,
    color: "#727070",
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#9c847a",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 20,
  },
  rule: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#ede8e4",
    borderBottomStyle: "solid",
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.7,
    color: "#727070",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#ede8e4",
    borderStyle: "solid",
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 7,
    color: "#9c847a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#010101",
    textAlign: "center",
  },
  kpiSub: {
    fontSize: 7,
    color: "#aba696",
    textAlign: "center",
  },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: "#ede8e4",
    borderStyle: "solid",
    borderRadius: 6,
    marginBottom: 6,
  },
  platformLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#010101",
  },
  platformStat: {
    fontSize: 9,
    color: "#727070",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 5,
  },
  bulletDot: {
    fontSize: 10,
    color: "#9c847a",
    lineHeight: 1.5,
  },
  bulletText: {
    fontSize: 10,
    color: "#727070",
    lineHeight: 1.6,
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 52,
    right: 52,
    borderTopWidth: 0.5,
    borderTopColor: "#d9d9d9",
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#aba696",
    textAlign: "center",
  },
});

function fmtNum(v: number | null) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-AU");
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const authHeader = req.headers.get("authorization");
  // Allow cron secret OR admin session
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const supabase = await createClient();

  if (!isCron) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if ((profile as any)?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId } = await params;

  // 1. Fetch report row
  const { data: report } = await (supabase as any)
    .from("monthly_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "done") return NextResponse.json({ url: report.pdf_url, cached: true });

  // Mark as generating
  await (supabase as any).from("monthly_reports").update({ status: "generating" }).eq("id", reportId);

  try {
    // 2. Fetch client profile + brand kit + analytics
    const [{ data: profile }, { data: brandKit }, { data: analytics }] = await Promise.all([
      supabase.from("profiles").select("full_name, business_name").eq("id", report.client_id).single(),
      (supabase as any).from("brand_kits").select("logo_url, colors").eq("client_id", report.client_id).single(),
      (supabase as any)
        .from("content_analytics")
        .select("*")
        .eq("client_id", report.client_id)
        .lte("period_start", report.report_period_end)
        .gte("period_end", report.report_period_start)
        .order("period_start", { ascending: false })
        .limit(20),
    ]);

    const clientName = (profile as any)?.business_name || (profile as any)?.full_name || "Client";
    const logoUrl = (brandKit as any)?.logo_url ?? null;
    const brandColors = (brandKit as any)?.colors ?? [];
    const accentColor = brandColors[0]?.hex ?? "#9c847a";

    const rows = analytics ?? [];
    const periodLabel = `${new Date(report.report_period_start).toLocaleDateString("en-AU", { day: "numeric", month: "long" })} – ${new Date(report.report_period_end).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`;

    // Aggregate across platforms
    const latestByPlatform = ["instagram", "facebook", "tiktok"].map((pl) => {
      const r = rows.find((a: any) => a.platform === pl);
      return { platform: pl, reach: r?.reach ?? null, impressions: r?.impressions ?? null, total_followers: r?.total_followers ?? null, engagement_rate: r?.engagement_rate ?? null, new_followers: r?.new_followers ?? null };
    }).filter((p) => p.reach != null || p.impressions != null);

    const totalReach = latestByPlatform.reduce((s, p) => s + (p.reach ?? 0), 0);
    const totalImpressions = latestByPlatform.reduce((s, p) => s + (p.impressions ?? 0), 0);
    const totalFollowers = latestByPlatform.reduce((s, p) => s + (p.total_followers ?? 0), 0);
    const newFollowers = latestByPlatform.reduce((s, p) => s + (p.new_followers ?? 0), 0);
    const engRates = latestByPlatform.filter((p) => p.engagement_rate != null).map((p) => p.engagement_rate!);
    const avgEng = engRates.length ? (engRates.reduce((s, v) => s + v, 0) / engRates.length).toFixed(2) : null;

    // 3. AI narrative
    const analyticsText = latestByPlatform.length
      ? latestByPlatform.map((p) =>
          `${p.platform}: reach ${p.reach ?? "—"}, impressions ${p.impressions ?? "—"}, followers ${p.total_followers ?? "—"}, new followers ${p.new_followers ?? "—"}, engagement ${p.engagement_rate != null ? `${p.engagement_rate}%` : "—"}`
        ).join("\n")
      : "No data available for this period.";

    const aiPrompt = `You are writing a monthly performance report for ${clientName}, a client of Lens & Launch Media.
Period: ${periodLabel}

Analytics data:
${analyticsText}

Write three things in JSON:
1. "summary": A 2-3 sentence executive summary of the period's performance (warm, professional, outcome-focused).
2. "wins": An array of 3 concise bullet strings highlighting what performed well.
3. "recommendations": An array of 3 actionable bullet strings for next month.

Return ONLY valid JSON with keys: summary (string), wins (string[]), recommendations (string[]).`;

    const aiMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: aiPrompt }],
    });

    const rawAi = aiMessage.content[0].type === "text" ? aiMessage.content[0].text : "{}";
    const cleaned = rawAi.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    let ai: { summary: string; wins: string[]; recommendations: string[] };
    try {
      ai = JSON.parse(cleaned);
    } catch {
      ai = { summary: rawAi.slice(0, 300), wins: [], recommendations: [] };
    }

    // 4. Build PDF
    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoArea}>
              {logoUrl ? (
                <Image src={logoUrl} style={styles.clientLogo} />
              ) : (
                <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: "#010101" }}>{clientName}</Text>
              )}
            </View>
            <Text style={styles.llLogo}>Lens & Launch Media</Text>
          </View>

          <Text style={styles.reportTitle}>Monthly Performance Report</Text>
          <Text style={styles.reportMeta}>{clientName} · {periodLabel}</Text>

          {/* Executive Summary */}
          <Text style={styles.sectionLabel}>Executive Summary</Text>
          <View style={styles.rule} />
          <Text style={styles.bodyText}>{ai.summary || "No summary available."}</Text>

          {/* Performance at a Glance */}
          <Text style={styles.sectionLabel}>Performance at a Glance</Text>
          <View style={styles.rule} />
          <View style={styles.kpiRow}>
            {[
              { label: "Total Reach",    value: fmtNum(totalReach) },
              { label: "Impressions",    value: fmtNum(totalImpressions) },
              { label: "Followers",      value: fmtNum(totalFollowers) },
              { label: "New Followers",  value: fmtNum(newFollowers) },
              { label: "Avg Engagement", value: avgEng ? `${avgEng}%` : "—" },
            ].map(({ label, value }) => (
              <View key={label} style={{ ...styles.kpiCard, borderColor: accentColor + "40" }}>
                <Text style={{ ...styles.kpiLabel, color: accentColor }}>{label}</Text>
                <Text style={styles.kpiValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Platform Breakdown */}
          {latestByPlatform.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Platform Breakdown</Text>
              <View style={styles.rule} />
              {latestByPlatform.map((p) => (
                <View key={p.platform} style={styles.platformRow}>
                  <Text style={styles.platformLabel}>{p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}</Text>
                  <View style={{ flexDirection: "row", gap: 20 }}>
                    <Text style={styles.platformStat}>Reach: {fmtNum(p.reach)}</Text>
                    <Text style={styles.platformStat}>Impressions: {fmtNum(p.impressions)}</Text>
                    <Text style={styles.platformStat}>Followers: {fmtNum(p.total_followers)}</Text>
                    {p.engagement_rate != null && <Text style={styles.platformStat}>Engagement: {p.engagement_rate}%</Text>}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* What's Working */}
          {ai.wins?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>What&apos;s Working</Text>
              <View style={styles.rule} />
              {ai.wins.map((w, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={{ ...styles.bulletDot, color: accentColor }}>•</Text>
                  <Text style={styles.bulletText}>{w}</Text>
                </View>
              ))}
            </>
          )}

          {/* Recommendations */}
          {ai.recommendations?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Recommendations for Next Month</Text>
              <View style={styles.rule} />
              {ai.recommendations.map((r, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={{ ...styles.bulletDot, color: accentColor }}>•</Text>
                  <Text style={styles.bulletText}>{r}</Text>
                </View>
              ))}
            </>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Lens &amp; Launch Media · lensandlaunch.com · Confidential</Text>
          </View>
        </Page>
      </Document>
    );

    const buffer = await renderToBuffer(doc);

    // 5. Upload PDF
    const filename = `reports/${reportId}.pdf`;
    await supabase.storage.from("proposals").upload(filename, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    const { data: urlData } = supabase.storage.from("proposals").getPublicUrl(filename);

    // 6. Update report row
    await (supabase as any).from("monthly_reports").update({
      status: "done",
      pdf_url: urlData.publicUrl,
      generated_at: new Date().toISOString(),
    }).eq("id", reportId);

    return NextResponse.json({ url: urlData.publicUrl });

  } catch (err: any) {
    console.error("Report generation failed:", err);
    await (supabase as any).from("monthly_reports").update({ status: "failed" }).eq("id", reportId);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
