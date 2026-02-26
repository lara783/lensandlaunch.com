import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graphGet(path: string, token?: string) {
  const sep = path.includes("?") ? "&" : "?";
  const url = token ? `${GRAPH}${path}${sep}access_token=${token}` : `${GRAPH}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Graph API error (${res.status})`);
  return json;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code      = searchParams.get("code");
  const clientId  = searchParams.get("state");
  const oauthErr  = searchParams.get("error_description") ?? searchParams.get("error");

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const returnBase = `${appUrl}/admin/clients/${clientId}?tab=analytics`;

  if (oauthErr || !code || !clientId) {
    const msg = oauthErr ?? "Authorization cancelled";
    return NextResponse.redirect(`${returnBase}&meta_error=${encodeURIComponent(msg)}`);
  }

  const appId     = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const redirectUri = `${appUrl}/api/admin/meta/callback`;

  try {
    // 1. Exchange code for short-lived user token
    const tokenData = await graphGet(
      `/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const shortToken: string = tokenData.access_token;

    // 2. Exchange for long-lived user token (60 days)
    const llData = await graphGet(
      `/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longToken: string = llData.access_token;

    // 3. Get all managed pages + their permanent page access tokens
    const pagesData = await graphGet(`/me/accounts?fields=id,name,access_token`, longToken);
    const rawPages: Array<{ id: string; name: string; access_token: string }> = pagesData.data ?? [];

    if (rawPages.length === 0) {
      return NextResponse.redirect(
        `${returnBase}&meta_error=${encodeURIComponent("No Facebook Pages found on this account. Make sure you have admin access to the client's page.")}`
      );
    }

    // 4. For each page, look up its Instagram Business Account ID
    const pages = await Promise.all(
      rawPages.map(async (page) => {
        let igAccountId: string | null = null;
        try {
          const igData = await graphGet(
            `/${page.id}?fields=instagram_business_account`,
            page.access_token
          );
          igAccountId = igData.instagram_business_account?.id ?? null;
        } catch {
          // No IG account linked to this page — that's fine
        }
        return {
          id:             page.id,
          name:           page.name,
          access_token:   page.access_token,
          ig_account_id:  igAccountId,
        };
      })
    );

    // 5a. Single page → save directly, no picker needed
    if (pages.length === 1) {
      const supabase = await createClient();
      await (supabase as any).from("profiles").update({
        meta_page_token:      pages[0].access_token,
        meta_fb_page_id:      pages[0].id,
        meta_ig_account_id:   pages[0].ig_account_id,
        meta_token_synced_at: null,
      }).eq("id", clientId);

      return NextResponse.redirect(`${returnBase}&meta_connected=1`);
    }

    // 5b. Multiple pages → send to picker
    const encoded = Buffer.from(JSON.stringify(pages)).toString("base64url");
    return NextResponse.redirect(`${returnBase}&meta_pages=${encoded}`);

  } catch (err: any) {
    const msg = err.message ?? "Unknown error during Meta connection";
    return NextResponse.redirect(`${returnBase}&meta_error=${encodeURIComponent(msg)}`);
  }
}
