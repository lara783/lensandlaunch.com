import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
              <Text style={styles.body}>{s.body}</Text>
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

    // Upload to Supabase Storage
    const filename = `proposals/${proposalId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("proposals")
      .upload(filename, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "PDF upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("proposals").getPublicUrl(filename);

    // Update proposal with PDF URL
    await supabase
      .from("proposals")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", proposalId);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
