import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const clientId = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const redirectBase = `${appUrl}/admin/clients/${clientId}?tab=analytics`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}&tiktok_error=${encodeURIComponent(error)}`);
  }

  if (!code || !clientId) {
    return NextResponse.redirect(`${redirectBase}&tiktok_error=missing_params`);
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/admin/tiktok/callback`;

  // Exchange code for access + refresh tokens
  const tokenBody = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error !== "ok" || !tokenData.data?.access_token) {
    const msg = tokenData.message ?? tokenData.error ?? "token_exchange_failed";
    return NextResponse.redirect(`${redirectBase}&tiktok_error=${encodeURIComponent(msg)}`);
  }

  const { access_token, refresh_token, open_id } = tokenData.data;

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: dbError } = await supabase
    .from("profiles")
    .update({
      tiktok_access_token: access_token,
      tiktok_refresh_token: refresh_token,
      tiktok_open_id: open_id,
      tiktok_token_synced_at: null,
    })
    .eq("id", clientId);

  if (dbError) {
    return NextResponse.redirect(
      `${redirectBase}&tiktok_error=${encodeURIComponent(dbError.message)}`
    );
  }

  return NextResponse.redirect(`${redirectBase}&tiktok_connected=1`);
}
