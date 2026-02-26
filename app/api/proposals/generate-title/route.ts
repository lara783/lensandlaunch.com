import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { clientName, businessName, context } = await req.json();
  if (!context?.trim()) {
    return NextResponse.json({ error: "Missing context" }, { status: 400 });
  }

  const name = businessName?.trim() || clientName?.trim() || "the client";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    messages: [{
      role: "user",
      content: `Generate a short, professional proposal title for Lens & Launch Media.
Client/business: ${name}
Context: ${context}

Rules:
- Max 8 words
- No quotes, no markdown
- Format: [Service Type] — [Business Name] or similar
- Examples: "Monthly Content Retainer — Coastal Bakery", "Photography Package — Smith & Co", "Social Media Strategy — The Pearl Hotel"
- Return ONLY the title, nothing else.`,
    }],
  });

  const title = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  return NextResponse.json({ title });
}
