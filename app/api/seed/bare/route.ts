import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/seed/bare — creates a blank test client account (no sample data).
// Use this to test the full flow from scratch through the UI.
// Protected by CRON_SECRET.
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const email = "test@coastalcafe.com.au";
  const password = "Demo1234!";

  // Delete existing test account cleanly so the route is idempotent
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // Already exists — return credentials without re-creating
    return NextResponse.json({
      message: "Test client already exists.",
      credentials: { email, password },
    });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "User creation failed" }, { status: 500 });
  }

  await supabase.from("profiles").upsert({
    id: authData.user.id,
    email,
    full_name: "Sarah Nguyen",
    business_name: "Coastal Café Co.",
    role: "client",
    analytics_enabled: false,
    onboarding_complete: false,
  });

  return NextResponse.json({
    message: "✅ Blank test client created. No projects or data — start fresh.",
    credentials: { email, password },
    clientId: authData.user.id,
  });
}
