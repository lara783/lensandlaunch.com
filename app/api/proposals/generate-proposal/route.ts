import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SelectedService {
  category: string;
  name: string;
  rate: number;
  unit: string;
}

interface SectionSpec {
  heading: string;
  useTiers: boolean;
  useScopeTable: boolean;
  useTimeline: boolean;
}

function buildServicesText(services: SelectedService[]): string {
  if (!services.length) return "";
  const grouped: Record<string, SelectedService[]> = {};
  for (const s of services) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }
  const lines: string[] = ["--- SERVICES INCLUDED IN THIS PROPOSAL ---"];
  for (const [cat, items] of Object.entries(grouped)) {
    lines.push(`\n${cat}:`);
    for (const s of items) {
      const rate = s.unit === "per_hour" ? `$${s.rate.toFixed(2)}/hr` : `$${s.rate.toFixed(2)}`;
      lines.push(`  • ${s.name}: ${rate}`);
    }
  }
  lines.push("--- END SERVICES ---");
  return lines.join("\n");
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
  }

  const { proposalTitle, clientName, context, sections, selectedServices } = await req.json() as {
    proposalTitle: string;
    clientName: string;
    context: string;
    sections: SectionSpec[];
    selectedServices: SelectedService[];
  };

  if (!proposalTitle || !sections?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const servicesText = buildServicesText(selectedServices ?? []);

  // Build section instructions
  const sectionInstructions = sections.map((s) => {
    if (s.useTiers) {
      return `"${s.heading}": { "body": "<2-sentence warm intro>", "tiers": [{"name":"Essential","price":<number>,"period":"month","tagline":"<5-10 word outcome>","highlighted":false},{"name":"Growth","price":<number>,"period":"month","tagline":"<5-10 word outcome>","highlighted":true},{"name":"Premium","price":<number>,"period":"month","tagline":"<5-10 word outcome>","highlighted":false}] }`;
    }
    if (s.useScopeTable) {
      return `"${s.heading}": { "body": "<2-sentence warm intro>", "scopeItems": [{"feature":"<feature name>","essential":"<'' or '✓' or quantity>","growth":"<'' or '✓' or quantity>","premium":"<'' or '✓' or quantity>"}, ...8-12 rows total] }`;
    }
    if (s.useTimeline) {
      return `"${s.heading}": { "body": "<optional 1-sentence intro or empty string>", "timelineSteps": [{"step":1,"title":"<short action title>","description":"<1-2 sentences>"},{"step":2,"title":"...","description":"..."},{"step":3,"title":"...","description":"..."},{"step":4,"title":"...","description":"..."}] }`;
    }
    return `"${s.heading}": "<2-4 paragraphs of warm professional prose>"`;
  }).join(",\n  ");

  const prompt = `You are writing a complete professional proposal for Lens & Launch Media, a photography, videography, and content strategy agency based on the Sunshine Coast, Australia.

STRICT RULES:
- NEVER mention hourly rates, day rates, internal costs, or raw deliverable counts.
- NEVER use words like "deliverables", "line items", or "scope breakdown".
- Write as if value comes from outcome, not effort.
- All pricing must be clean numbers only (no $ symbol in JSON number fields).
- Taglines are outcome-focused, 5-10 words, no pricing mentioned.
- Body prose is warm, confident, agency voice. No bullet points. No headings within prose.
- SHOOTS ARE QUARTERLY: Every plan includes at least one shoot per quarter — Essential = 1/qtr (min 2hrs), Growth = 2/qtr, Premium = 3+/qtr. NEVER say "monthly shoot".
- REPORTING IS MONTHLY for Growth and Premium plans only. Essential/base plan does NOT include monthly reporting.
- All other deliverables (content creation, scheduling, editing) run on their natural cadence.
- For scope table sections: scopeItems cells use "" (empty string) if not included, "✓" if included, or a quantity like "1/qtr", "2/qtr", "monthly". Use "per qtr" for shoot rows and "monthly" for reporting rows. Essential = entry-level, Growth = mid-tier, Premium = full-service.
${servicesText ? `\n${servicesText}\n` : ""}
Proposal title: ${proposalTitle}
Client: ${clientName}
Context: ${context}

Return ONLY valid JSON — no other text, no markdown fences, no explanation. Use this exact structure:
{
  ${sectionInstructions}
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON. Try again." }, { status: 500 });
    }

    return NextResponse.json({ sections: parsed });
  } catch (err: any) {
    console.error("Anthropic error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
