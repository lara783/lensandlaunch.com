import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { ProposalSection } from "@/lib/supabase/types";

// Register fonts (Helvetica is built-in as fallback)
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 56,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#9c847a",
    borderBottomStyle: "solid",
    paddingBottom: 20,
  },
  logo: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#9c847a",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    color: "#010101",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: "#727070",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#010101",
    marginBottom: 6,
  },
  rule: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#9c847a",
    borderBottomStyle: "solid",
    marginBottom: 10,
    opacity: 0.4,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.7,
    color: "#727070",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: "#d9d9d9",
    borderTopStyle: "solid",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#aba696",
    textAlign: "center",
  },
  scopeTableHeader: {
    flexDirection: "row",
    backgroundColor: "#010101",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 0,
  },
  scopeTableHeaderCell: {
    fontSize: 7,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scopeTableRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ede8e4",
    borderBottomStyle: "solid",
  },
  scopeTableCell: {
    fontSize: 9,
    color: "#727070",
  },
  scopeTableCellHighlight: {
    fontSize: 9,
    color: "#9c847a",
    fontFamily: "Helvetica-Bold",
  },
});

export async function POST(req: NextRequest) {
  try {
    const { proposalId } = await req.json();
    if (!proposalId) return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });

    const supabase = await createClient();

    const { data: proposal } = await supabase
      .from("proposals")
      .select("*, profiles(full_name, business_name)")
      .eq("id", proposalId)
      .single();

    if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

    const sections = proposal.content as ProposalSection[];
    const clientName = (proposal.profiles as { full_name: string } | null)?.full_name ?? "Client";
    const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    const selectedTierName: string | null = (proposal as any).selected_tier_name ?? null;
    // Map tier name → scope column key
    const tierColumnKey = selectedTierName
      ? ({ Essential: "essential", Growth: "growth", Premium: "premium" } as Record<string, string>)[selectedTierName] ?? null
      : null;

    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>Lens &amp; Launch Media</Text>
            <Text style={styles.title}>{proposal.title}</Text>
            <Text style={styles.meta}>Prepared for {clientName} · {date}</Text>
          </View>

          {/* Sections */}
          {sections.map((s, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionHeading}>{s.heading}</Text>
              <View style={styles.rule} />
              {s.tiers && s.tiers.length > 0 ? (() => {
                const matchedTier = selectedTierName
                  ? s.tiers!.find(t => t.name === selectedTierName) ?? null
                  : null;

                if (matchedTier) {
                  // Single selected tier — centred prominent card
                  return (
                    <>
                      {s.body ? <Text style={{ ...styles.body, marginBottom: 10 }}>{s.body}</Text> : null}
                      <View style={{
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#9c847a",
                        borderStyle: "solid",
                        borderRadius: 8,
                        alignItems: "center",
                        alignSelf: "center",
                        width: "60%",
                      }}>
                        <Text style={{ fontSize: 7, color: "#9c847a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                          Selected Package
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#010101", marginBottom: 6 }}>
                          {matchedTier.name}
                        </Text>
                        <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: "#010101" }}>
                          ${matchedTier.price.toLocaleString()}
                        </Text>
                        {matchedTier.period ? (
                          <Text style={{ fontSize: 8, color: "#727070", marginTop: 2 }}>/{matchedTier.period}</Text>
                        ) : null}
                        {matchedTier.tagline ? (
                          <Text style={{ fontSize: 8, color: "#9c847a", textAlign: "center", marginTop: 6 }}>
                            {matchedTier.tagline}
                          </Text>
                        ) : null}
                      </View>
                    </>
                  );
                }

                // No tier selected yet — show all tiers side by side
                return (
                  <>
                    {s.body ? <Text style={{ ...styles.body, marginBottom: 10 }}>{s.body}</Text> : null}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {s.tiers!.map((tier, ti) => (
                        <View key={ti} style={{
                          flex: 1,
                          padding: 10,
                          borderWidth: tier.highlighted ? 1 : 0.5,
                          borderColor: tier.highlighted ? "#9c847a" : "#d9d9d9",
                          borderStyle: "solid",
                          borderRadius: 6,
                          alignItems: "center",
                        }}>
                          {tier.highlighted && (
                            <Text style={{ fontSize: 6, color: "#9c847a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                              Most popular
                            </Text>
                          )}
                          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#010101", marginBottom: 4 }}>
                            {tier.name}
                          </Text>
                          <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: "#010101" }}>
                            ${tier.price.toLocaleString()}
                          </Text>
                          {tier.period ? (
                            <Text style={{ fontSize: 7, color: "#727070" }}>/{tier.period}</Text>
                          ) : null}
                          {tier.tagline ? (
                            <Text style={{ fontSize: 7, color: "#9c847a", textAlign: "center", marginTop: 5 }}>
                              {tier.tagline}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </>
                );
              })() : (s as any).scopeItems && (s as any).scopeItems.length > 0 ? (
                <>
                  {s.body ? <Text style={{ ...styles.body, marginBottom: 8 }}>{s.body}</Text> : null}
                  {tierColumnKey ? (
                    /* Single-column scope table for selected tier */
                    <>
                      <View style={styles.scopeTableHeader}>
                        <Text style={{ ...styles.scopeTableHeaderCell, flex: 3 }}>Feature</Text>
                        <Text style={{ ...styles.scopeTableHeaderCell, flex: 1, textAlign: "center" }}>{selectedTierName}</Text>
                      </View>
                      {(s as any).scopeItems.map((item: Record<string, string>, si: number) => (
                        <View key={si} style={{ ...styles.scopeTableRow, backgroundColor: si % 2 === 0 ? "#faf9f8" : "#ffffff" }}>
                          <Text style={{ ...styles.scopeTableCell, flex: 3 }}>{item.feature}</Text>
                          <Text style={{ ...styles.scopeTableCellHighlight, flex: 1, textAlign: "center" }}>{item[tierColumnKey] || "—"}</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    /* All-tiers scope comparison table */
                    <>
                      <View style={styles.scopeTableHeader}>
                        <Text style={{ ...styles.scopeTableHeaderCell, flex: 2 }}>Feature</Text>
                        <Text style={{ ...styles.scopeTableHeaderCell, flex: 1, textAlign: "center" }}>Essential</Text>
                        <Text style={{ ...styles.scopeTableHeaderCell, flex: 1, textAlign: "center" }}>Growth</Text>
                        <Text style={{ ...styles.scopeTableHeaderCell, flex: 1, textAlign: "center" }}>Premium</Text>
                      </View>
                      {(s as any).scopeItems.map((item: { feature: string; essential: string; growth: string; premium: string }, si: number) => (
                        <View key={si} style={{ ...styles.scopeTableRow, backgroundColor: si % 2 === 0 ? "#faf9f8" : "#ffffff" }}>
                          <Text style={{ ...styles.scopeTableCell, flex: 2 }}>{item.feature}</Text>
                          <Text style={{ ...styles.scopeTableCell, flex: 1, textAlign: "center" }}>{item.essential || "—"}</Text>
                          <Text style={{ ...styles.scopeTableCellHighlight, flex: 1, textAlign: "center" }}>{item.growth || "—"}</Text>
                          <Text style={{ ...styles.scopeTableCell, flex: 1, textAlign: "center" }}>{item.premium || "—"}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </>
              ) : (s as any).timelineSteps && (s as any).timelineSteps.length > 0 ? (
                <>
                  {s.body ? <Text style={{ ...styles.body, marginBottom: 8 }}>{s.body}</Text> : null}
                  {(s as any).timelineSteps.map((step: { step: number; title: string; description: string }, si: number) => (
                    <View key={si} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(156,132,122,0.15)", alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1, flexShrink: 0 }}>
                        <Text style={{ fontSize: 9, fontWeight: "bold", color: "#9c847a" }}>{step.step}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: "#010101", marginBottom: 2 }}>{step.title}</Text>
                        <Text style={{ ...styles.body, marginBottom: 0 }}>{step.description}</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.body}>{s.body}</Text>
              )}
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Lens &amp; Launch Media · lensandlaunch.com · Confidential
            </Text>
          </View>
        </Page>
      </Document>
    );

    const buffer = await renderToBuffer(doc);

    // Use service role for storage — session client lacks storage write permissions via RLS
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Upload to Supabase Storage
    const filename = `proposals/${proposalId}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("proposals")
      .upload(filename, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: `PDF upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("proposals").getPublicUrl(filename);

    // Update proposal with PDF URL
    await admin
      .from("proposals")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", proposalId);

    // Attach PDF to HubSpot deal (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.lensandlaunch.com";
    fetch(`${appUrl}/api/hubspot/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, action: "pdf_ready", pdfUrl: urlData.publicUrl }),
    }).catch(() => {});

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
