import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return NextResponse.json({ error: "TIKTOK_CLIENT_KEY env var not set" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const redirectUri = `${appUrl}/api/admin/tiktok/callback`;

  const oauthUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  oauthUrl.searchParams.set("client_key", clientKey);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", "user.info.basic,user.info.stats,video.list");
  oauthUrl.searchParams.set("state", clientId);

  return NextResponse.redirect(oauthUrl.toString());
}
