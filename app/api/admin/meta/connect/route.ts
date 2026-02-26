import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return NextResponse.json({ error: "FACEBOOK_APP_ID env var not set" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const redirectUri = `${appUrl}/api/admin/meta/callback`;

  const oauthUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("scope", [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
    "read_insights",
  ].join(","));
  oauthUrl.searchParams.set("state", clientId);
  oauthUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(oauthUrl.toString());
}
