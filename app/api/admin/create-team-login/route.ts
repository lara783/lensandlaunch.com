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

  const { teamMemberId, email, password, name } = await req.json();
  if (!teamMemberId || !email || !password || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check if a user already exists with this email
  const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  let authUserId: string;

  if (existingUser) {
    // Update password on the existing account
    const { error: updateErr } = await serviceClient.auth.admin.updateUserById(existingUser.id, { password });
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
    authUserId = existingUser.id;
  } else {
    // Create new auth user
    const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr || !newUser.user) return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 400 });
    authUserId = newUser.user.id;
  }

  // Upsert the profile with role = 'team'
  const { error: profileErr } = await serviceClient.from("profiles").upsert({
    id: authUserId,
    email,
    full_name: name,
    role: "team",
  });
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });

  // Link profile_id on the team_members row
  const { error: linkErr } = await serviceClient
    .from("team_members")
    .update({ profile_id: authUserId, email })
    .eq("id", teamMemberId);
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 });

  return NextResponse.json({ success: true, userId: authUserId });
}
