import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SelectedService {
  category: string;
  name: string;
  rate: number;
  unit: string;
}

function buildSelectedServicesText(selectedServices: SelectedService[]): string {
  if (!selectedServices.length) return "";
  const grouped: Record<string, SelectedService[]> = {};
  for (const s of selectedServices) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }
  const lines: string[] = ["--- SERVICES INCLUDED IN THIS PROPOSAL ---"];
  for (const [cat, items] of Object.entries(grouped)) {
    lines.push(`\n${cat}:`);
    for (const s of items) {
      const rateStr = s.unit === "per_hour" ? `$${s.rate.toFixed(2)}/hr` : `$${s.rate.toFixed(2)}`;
      lines.push(`  • ${s.name}: ${rateStr}`);
    }
  }
  lines.push("--- END SERVICES ---");
  return lines.join("\n");
}

async function buildRateCardContext(): Promise<{ packages: string; shootHours: string }> {
  try {
    const supabase = await createClient();
    const { data: services } = await (supabase as any)
      .from("services")
      .select("category, name, charge_out_rate, unit")
      .eq("active", true)
      .order("sort_order");

    if (!services || services.length === 0) return { packages: "", shootHours: "" };

    const fixed = services.filter((s: any) => s.unit === "fixed");
    const hourly = services.filter((s: any) => s.unit === "per_hour");

    // Fixed packages
    let packages = "";
    if (fixed.length) {
      const grouped: Record<string, typeof fixed> = {};
      for (const s of fixed) {
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
      packages = lines.join("\n");
    }

    // Hourly shoot services — for scope sizing context only, never reveal rates to client
    let shootHours = "";
    if (hourly.length) {
      const lines: string[] = ["--- SHOOT HOURS (internal scope context only — do NOT reveal rates) ---"];
      for (const s of hourly as any[]) {
        lines.push(`  • ${s.name}: $${s.charge_out_rate.toFixed(2)}/hr`);
      }
      lines.push("--- END SHOOT HOURS ---");
      shootHours = lines.join("\n");
    }

    return { packages, shootHours };
  } catch {
    return { packages: "", shootHours: "" };
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set in .env.local" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { sectionHeading, context, proposalTitle, clientName, useTiers, useScopeTable, useTimeline, selectedServices } = await req.json();

  if (!sectionHeading) {
    return NextResponse.json({ error: "Missing sectionHeading" }, { status: 400 });
  }

  // Use proposal-specific services if provided; fall back to full rate card from DB
  let rateCardPackages = "";
  let rateCardShootHours = "";
  if (selectedServices?.length) {
    const fixed = selectedServices.filter((s: SelectedService) => s.unit !== "per_hour");
    const hourly = selectedServices.filter((s: SelectedService) => s.unit === "per_hour");
    rateCardPackages = fixed.length ? buildSelectedServicesText(fixed) : "";
    if (hourly.length) {
      const lines = ["--- SHOOT HOURS (internal scope context only — do NOT reveal rates) ---"];
      for (const s of hourly) lines.push(`  • ${s.name}: $${s.rate.toFixed(2)}/hr`);
      lines.push("--- END SHOOT HOURS ---");
      rateCardShootHours = lines.join("\n");
    }
  } else {
    const ctx = await buildRateCardContext();
    rateCardPackages = ctx.packages;
    rateCardShootHours = ctx.shootHours;
  }

  const isPricingSection = /pric|cost|package|investment/i.test(sectionHeading);

  // Shared shoot context injected into scope-related prompts
  const SHOOT_CONTEXT = `
SHOOT & DELIVERY RULES (critical — follow exactly):
- SHOOTS ARE QUARTERLY. Every content plan includes at least one shoot per quarter (not per month).
- Essential plan: 1 shoot per quarter (minimum 2 hours).
- Growth plan: 2 shoots per quarter.
- Premium plan: 3 or more shoots per quarter.
- In scope tables, express shoot frequency as "1/qtr", "2/qtr", "3/qtr". NEVER use "per month" for shoots.
- PERFORMANCE REVIEW & REPORTING IS MONTHLY — but ONLY for Growth and Premium plans. Essential/base plan does NOT include monthly reporting.
- All other deliverables (content creation, post scheduling, editing, etc.) run on their natural cadence — typically monthly or as agreed.
- Billing is monthly (the package price is per month).
- NEVER reveal shoot hour durations, hourly rates, or day rates in client-facing copy.
${rateCardShootHours ? `\n${rateCardShootHours}` : ""}`;

  let prompt: string;

  if (useTimeline) {
    prompt = `You are writing a professional service proposal for Lens & Launch Media, a photography, videography, and content strategy agency based on the Sunshine Coast, Australia.

Proposal title: ${proposalTitle}
Client: ${clientName}
${context ? `Timeline notes: ${context}` : ""}

Return ONLY valid JSON — no other text, no markdown, no explanation. Use this exact structure:
{
  "timelineSteps": [
    {"step": 1, "title": "<short step title, 3-6 words>", "description": "<1-2 sentences describing what happens in this phase>"},
    {"step": 2, "title": "...", "description": "..."},
    {"step": 3, "title": "...", "description": "..."},
    {"step": 4, "title": "...", "description": "..."}
  ],
  "body": "<optional 1-2 sentence warm intro for the timeline section, or empty string>"
}

Rules:
- Return 3–5 steps covering the client journey from start to finish.
- Step titles: short and action-oriented (e.g. "Creative Direction Call", "Quarterly Shoot", "Content Delivery").
- Descriptions: warm, client-facing, outcome-focused. No jargon, no bullet points.
- Body can be empty string if the steps speak for themselves.
- Shoots are quarterly — reflect this in the shoot step description if relevant.`;
  } else if (useScopeTable) {
    prompt = `You are writing a professional service proposal for Lens & Launch Media, a photography, videography, and content strategy agency based on the Sunshine Coast, Australia.
${rateCardPackages ? `\n${rateCardPackages}\n` : ""}${SHOOT_CONTEXT}

Proposal title: ${proposalTitle}
Client: ${clientName}
${context ? `Scope notes: ${context}` : ""}

Return ONLY valid JSON — no other text, no markdown, no explanation. Use this exact structure:
{
  "scopeItems": [
    {"feature": "<feature name>", "essential": "<value>", "growth": "<value>", "premium": "<value>"},
    ...
  ],
  "body": "<2-3 sentence intro paragraph for the scope section>"
}

Rules:
- List 8–12 features/deliverables that differentiate the three plans.
- For each cell: use "" (empty string) if not included, "✓" if included, or a quantity like "1/qtr", "2/qtr", "8/qtr" etc.
- Shoot rows must use quarterly frequency ("1/qtr", "2/qtr", "3/qtr"). NEVER "per month" for shoots.
- Essential = entry-level (1 shoot/qtr min 2hrs), Growth = mid-tier, Premium = full-service.
- Body is warm agency prose, no bullet points, no pricing figures.
- Features should reflect what's in the selected services and the scope notes above.`;
  } else if (useTiers) {
    prompt = `You are writing a professional service proposal for Lens & Launch Media, a photography, videography, and content strategy agency based on the Sunshine Coast, Australia.
${rateCardPackages ? `\n${rateCardPackages}\n` : ""}
Proposal title: ${proposalTitle}
Client: ${clientName}
${context ? `Pricing notes: ${context}` : ""}

Return ONLY valid JSON — no other text, no markdown, no explanation. Use this exact structure:
{
  "tiers": [
    {"name":"Essential","price":<number>,"period":"month","tagline":"<one concise line>","highlighted":false},
    {"name":"Growth","price":<number>,"period":"month","tagline":"<one concise line>","highlighted":true},
    {"name":"Premium","price":<number>,"period":"month","tagline":"<one concise line>","highlighted":false}
  ],
  "body": "<2-3 sentence warm intro paragraph for the investment section>"
}

Rules:
- Prices must be plain numbers (no $ symbols). Period is always "month" (billed monthly).
- Taglines are 5–10 words each, outcome-focused, no pricing mentioned.
- Body is warm agency prose, no bullet points, no pricing figures.
- NEVER reveal hourly rates, shoot durations, or deliverable counts.`;
  } else {
    prompt = `You are writing a professional service proposal for Lens & Launch Media, a photography, videography, and content strategy agency based on the Sunshine Coast, Australia.

STRICT RULES — follow these without exception:
- NEVER mention hourly rates, day rates, or any per-hour/per-day pricing.
- NEVER reveal the internal scope breakdown, editing hours, or raw deliverable counts.
- NEVER use words like "deliverables", "scope of work", or "line items".
- If referencing investment, only state the total package investment as a single figure.
- Write as if the value comes from the outcome, not the effort behind it.
- Shoots happen quarterly (once per quarter minimum). NEVER say "monthly shoot". Performance reviews and reporting are monthly.
${rateCardPackages ? `\n${rateCardPackages}\n\nFor pricing sections, you may reference the total package investment amount from the list above. Do not mention individual line items or hourly components.` : ""}

Write the "${sectionHeading}" section of a proposal.

Proposal title: ${proposalTitle}
Client: ${clientName}
${context ? `Notes for this section: ${context}` : ""}
${isPricingSection && rateCardPackages ? `\nThis is an investment/pricing section. State only the total package investment. Do not itemise.` : ""}

Write warm, confident, professional proposal copy for this section only. 2–4 short paragraphs. No headings or bullet points — flowing prose only. Do not mention Lara by name. Write in the voice of the agency.`;
  }

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
