import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Verify the requesting user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Use service role to bypass RLS — safe because we've verified auth above
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const payload = {
    ...body,
    client_id: user.id,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("onboarding_briefs")
    .upsert(payload, { onConflict: "client_id" });

  if (error) {
    console.error("Save brief error:", error);
    return NextResponse.json({ error: error.message ?? error.code ?? "Save failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, clientId: user.id });
}
