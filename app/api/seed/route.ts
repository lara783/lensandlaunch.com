import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/seed — creates a demo client account with fully populated test data.
// Protected by the same CRON_SECRET used for the cron routes.
// Run once: curl -X POST https://your-domain/api/seed -H "Authorization: Bearer $CRON_SECRET"
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const email = "sarah@coastalcafe.com.au";
  const password = "Demo1234!";

  // Check if already seeded
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Already seeded", credentials: { email, password } });
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "User creation failed" }, { status: 500 });
  }
  const clientId = authData.user.id;

  // 2. Upsert profile (in case the insert trigger already created a row)
  await supabase.from("profiles").upsert({
    id: clientId,
    email,
    full_name: "Sarah Nguyen",
    business_name: "Coastal Café Co.",
    role: "client",
    analytics_enabled: true,
    onboarding_complete: false,
  });

  // 3. Project
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .insert({
      client_id: clientId,
      name: "Content Retainer — 2026",
      description:
        "Monthly social media content, photography, and creative strategy for Coastal Café Co.",
      service_type: "retainer",
      status: "active",
      start_date: "2026-01-01",
    })
    .select()
    .single();
  if (projErr || !project) {
    return NextResponse.json({ error: projErr?.message ?? "Project creation failed" }, { status: 500 });
  }
  const projectId = project.id;

  // 4. Deliverables
  await supabase.from("deliverables").insert([
    {
      project_id: projectId,
      title: "Brand Photography — January",
      description: "Full-day studio shoot, 30 edited images delivered in hi-res + web formats.",
      due_date: "2026-01-28",
      agency_approved: true,
      client_approved: true,
      sort_order: 1,
    },
    {
      project_id: projectId,
      title: "Social Reels — February Pack",
      description: "4× short-form reels (15–30 s), branded captions and hashtag sets included.",
      due_date: "2026-02-14",
      agency_approved: true,
      client_approved: false,
      sort_order: 2,
    },
    {
      project_id: projectId,
      title: "Blog Post — February",
      description: "1,000-word SEO article about the seasonal autumn menu launch.",
      due_date: "2026-02-20",
      agency_approved: false,
      client_approved: false,
      sort_order: 3,
    },
    {
      project_id: projectId,
      title: "Monthly Strategy Document — March",
      description: "Content calendar, platform strategy, and creative brief for March 2026.",
      due_date: "2026-02-28",
      agency_approved: false,
      client_approved: false,
      sort_order: 4,
    },
  ]);

  // 5. Calendar events
  await supabase.from("calendar_events").insert([
    {
      project_id: projectId,
      title: "Brand Photography Shoot",
      start_date: "2026-03-03T09:00:00+10:00",
      end_date: "2026-03-03T17:00:00+10:00",
      type: "shoot",
      color: "#9c847a",
      notes: "Studio shoot at Coastal Café Co. Fitzroy location. Full day.",
    },
    {
      project_id: projectId,
      title: "Reel Edit — March Pack",
      start_date: "2026-03-06T09:00:00+10:00",
      end_date: "2026-03-06T17:00:00+10:00",
      type: "edit",
      color: "#aba696",
    },
    {
      project_id: projectId,
      title: "March Content Goes Live",
      start_date: "2026-03-13T10:00:00+10:00",
      end_date: "2026-03-13T10:30:00+10:00",
      type: "publish",
      color: "#010101",
    },
    {
      project_id: projectId,
      title: "Monthly Strategy Call",
      start_date: "2026-02-28T10:00:00+10:00",
      end_date: "2026-02-28T10:30:00+10:00",
      type: "meeting",
      color: "#696348",
      notes: "30-min strategy call to review March content plan.",
    },
  ]);

  // 6. Invoice
  await supabase.from("invoices").insert({
    project_id: projectId,
    client_id: clientId,
    invoice_number: "INV-001",
    amount: 2100,
    due_date: "2026-03-07",
    status: "pending",
    line_items: [
      {
        description: "Monthly Content Retainer — Growth Package (March 2026)",
        quantity: 1,
        unit_price: 2100,
        total: 2100,
      },
    ],
    notes: "Thank you for your continued partnership. Payment due within 7 days of issue.",
  });

  // 7. Proposal (status: sent — ready to sign)
  const { data: proposal } = await supabase
    .from("proposals")
    .insert({
      client_id: clientId,
      title: "Monthly Content Retainer — Coastal Café Co.",
      status: "sent",
      sent_at: new Date().toISOString(),
      content: [
        {
          heading: "Overview",
          body: "Lens & Launch Media will provide Coastal Café Co. with a comprehensive monthly content retainer, covering photography, short-form video, social media management, and creative strategy across Instagram and Facebook. Our goal is to grow your digital presence, drive meaningful engagement, and free you up to focus on running your café.",
        },
        {
          heading: "Scope of Work",
          body: "Full-service monthly content creation and social media management.",
          scopeItems: [
            {
              feature: "Monthly Photography",
              essential: "1 shoot/mo · 10 images",
              growth: "2 shoots/mo · 20 images",
              premium: "3 shoots/mo · 40 images",
            },
            {
              feature: "Short-form Reels",
              essential: "2 reels/mo",
              growth: "4 reels/mo",
              premium: "8 reels/mo",
            },
            {
              feature: "Caption Copywriting",
              essential: "Basic captions",
              growth: "Strategic + hashtags",
              premium: "Full brand voice + SEO",
            },
            {
              feature: "Platform Strategy",
              essential: "—",
              growth: "Monthly report",
              premium: "Weekly reporting + calls",
            },
            {
              feature: "Story / Highlights",
              essential: "—",
              growth: "4×/mo",
              premium: "Unlimited",
            },
          ],
        },
        {
          heading: "Investment",
          body: "Choose the package that fits your current goals. All packages include a dedicated account manager and monthly performance reporting.",
          tiers: [
            {
              name: "Essential",
              price: 1500,
              period: "month",
              tagline: "A great starting point for growing brands.",
              highlighted: false,
            },
            {
              name: "Growth",
              price: 2100,
              period: "month",
              tagline: "Most popular — perfect for active cafés.",
              highlighted: true,
            },
            {
              name: "Premium",
              price: 3500,
              period: "month",
              tagline: "Maximum output, full creative direction.",
              highlighted: false,
            },
          ],
        },
        {
          heading: "Next Steps",
          body: "1. Review this proposal carefully and sign below.\n2. We'll issue your first invoice within 24 hours.\n3. Your dedicated shoot date will be confirmed via the portal calendar within 48 hours.\n4. Your onboarding strategy call is booked for week one — you'll receive a calendar invite shortly.",
        },
      ],
    })
    .select()
    .single();

  // 8. Analytics — Instagram + Facebook
  await supabase.from("content_analytics").insert([
    {
      client_id: clientId,
      platform: "instagram",
      period_start: "2026-01-01",
      period_end: "2026-01-31",
      reach: 12400,
      impressions: 28700,
      new_followers: 142,
      total_followers: 3840,
      engagement_rate: 4.72,
      notes: "Strong reel performance in mid-January. Carousel posts drove saves and shares.",
    },
    {
      client_id: clientId,
      platform: "instagram",
      period_start: "2025-12-01",
      period_end: "2025-12-31",
      reach: 10100,
      impressions: 22300,
      new_followers: 98,
      total_followers: 3698,
      engagement_rate: 4.1,
      notes: "Holiday-themed content performed above average. Gift card posts drove traffic.",
    },
    {
      client_id: clientId,
      platform: "facebook",
      period_start: "2026-01-01",
      period_end: "2026-01-31",
      reach: 8900,
      impressions: 14200,
      new_followers: 34,
      total_followers: 1620,
      engagement_rate: 2.8,
      notes: "Boosted post reached new local audience within 5 km radius.",
    },
  ]);

  // 9. Brand kit
  await supabase.from("brand_kits").upsert({
    client_id: clientId,
    colors: ["#3B2F2F", "#C4956A", "#F5EFE6", "#2C2C2C", "#FFFFFF"],
    fonts: ["Playfair Display", "Lato"],
    voice_adjectives: ["Warm", "Artisanal", "Local", "Inviting"],
    voice_style:
      "Friendly and approachable with a touch of warmth. Coastal Café speaks like a knowledgeable friend — never corporate, always genuine. Short sentences, active voice, occasional emojis where natural.",
    logo_url: null,
  });

  // 10. Meeting log
  await supabase.from("meeting_logs").insert({
    client_id: clientId,
    project_id: projectId,
    title: "Onboarding Strategy Call",
    date: "2026-01-10",
    summary:
      "Discussed content strategy for Q1 2026. Client wants to focus on Instagram Reels and behind-the-scenes content. Key themes: seasonal menu, coffee craft, and team culture. Agreed on a warm, editorial photography style.",
    action_items: [
      "Finalise March shoot date with Sarah",
      "Share content calendar for client review",
      "Book recurring monthly strategy calls",
    ],
  });

  return NextResponse.json({
    message: "✅ Seed complete! Test client created.",
    credentials: { email, password },
    clientId,
    projectId,
    proposalId: proposal?.id ?? null,
    note: "Run this endpoint once only. Subsequent calls are blocked.",
  });
}
