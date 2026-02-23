import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Verify requester is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, full_name, business_name, password } = await req.json();
  if (!email || !full_name || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Use service role to create user without email confirmation
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: newUser, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Manually create the profile (trigger may not exist)
  if (newUser.user) {
    await serviceClient
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email,
        full_name,
        role: "client",
        business_name: business_name || null,
      });
  }

  return NextResponse.json({ id: newUser.user?.id });
}
