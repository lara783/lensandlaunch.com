import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function buildRateCardContext(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: services } = await (supabase as any)
      .from("services")
      .select("category, name, charge_out_rate, unit")
      .eq("active", true)
      .eq("unit", "fixed") // packages only — never expose hourly rates
      .order("sort_order");

    if (!services || services.length === 0) return "";

    const grouped: Record<string, typeof services> = {};
    for (const s of services) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }

    const lines: string[] = ["--- LENS & LAUNCH PACKAGES (internal reference only) ---"];
    for (const [cat, items] of Object.entries(grouped)) {
      lines.push(`\n${cat}:`);
      for (const s of items as any[]) {
        lines.push(`  • ${s.name}: $${s.charge_out_rate.toFixed(2)}`);
      }
    }
    lines.push("--- END PACKAGES ---");
    return lines.join("\n");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set in .env.local" }, { status: 500 });
  }

  const { sectionHeading, context, proposalTitle, clientName } = await req.json();

  if (!sectionHeading) {
    return NextResponse.json({ error: "Missing sectionHeading" }, { status: 400 });
  }

  const rateCard = await buildRateCardContext();

  const isPricingSection = /pric|cost|package|investment/i.test(sectionHeading);

  const prompt = `You are writing a professional service proposal for Lens & Launch Media, a photography, videography, and content strategy agency based on the Sunshine Coast, Australia.

STRICT RULES — follow these without exception:
- NEVER mention hourly rates, day rates, or any per-hour/per-day pricing.
- NEVER reveal the internal scope breakdown, number of shoots, editing hours, or deliverable counts.
- NEVER use words like "deliverables", "scope of work", or "line items".
- If referencing investment, only state the total package investment as a single figure.
- Write as if the value comes from the outcome, not the effort behind it.
${rateCard ? `\n${rateCard}\n\nFor pricing sections, you may reference the total package investment amount from the list above. Do not mention individual line items or hourly components.` : ""}

Write the "${sectionHeading}" section of a proposal.

Proposal title: ${proposalTitle}
Client: ${clientName}
${context ? `Notes for this section: ${context}` : ""}
${isPricingSection && rateCard ? `\nThis is an investment/pricing section. State only the total package investment. Do not itemise.` : ""}

Write warm, confident, professional proposal copy for this section only. 2–4 short paragraphs. No headings or bullet points — flowing prose only. Do not mention Lara by name. Write in the voice of the agency.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ content });
  } catch (err: any) {
    console.error("Anthropic API error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
