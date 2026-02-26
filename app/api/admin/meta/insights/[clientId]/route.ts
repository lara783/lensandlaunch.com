import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function graphGet(path: string, token: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH_BASE}${path}${sep}access_token=${token}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Graph API error (${res.status})`);
  }
  return json;
}

function sumValues(series: any): number | null {
  const vals = series?.values;
  if (!vals?.length) return null;
  return vals.reduce((acc: number, v: any) => acc + (Number(v.value) || 0), 0);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get client Meta credentials
  const { data: profile, error: profileErr } = await (supabase as any)
    .from("profiles")
    .select("meta_page_token, meta_fb_page_id, meta_ig_account_id")
    .eq("id", clientId)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { meta_page_token: token, meta_fb_page_id: fbPageId, meta_ig_account_id: igId } = profile;

  if (!token) {
    return NextResponse.json({ error: "No Meta access token configured for this client" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const d30 = now - 30 * 86400;
  const d60 = now - 60 * 86400;

  const result: Record<string, any> = {};

  // ── Facebook Page Insights ──────────────────────────────────────────────────
  if (fbPageId) {
    try {
      const metrics = [
        "page_impressions",
        "page_impressions_unique",
        "page_fan_adds_unique",
        "page_post_engagements",
      ].join(",");

      const [curr, prev, fans] = await Promise.all([
        graphGet(`/${fbPageId}/insights?metric=${metrics}&period=day&since=${d30}&until=${now}`, token),
        graphGet(`/${fbPageId}/insights?metric=${metrics}&period=day&since=${d60}&until=${d30}`, token),
        graphGet(`/${fbPageId}?fields=fan_count`, token).catch(() => null),
      ]);

      const get = (name: string, src: any) =>
        sumValues(src.data?.find((d: any) => d.name === name));

      result.facebook = {
        reach:              get("page_impressions_unique", curr),
        impressions:        get("page_impressions", curr),
        new_followers:      get("page_fan_adds_unique", curr),
        engagements:        get("page_post_engagements", curr),
        total_followers:    fans?.fan_count ?? null,
        prev_reach:         get("page_impressions_unique", prev),
        prev_impressions:   get("page_impressions", prev),
        prev_new_followers: get("page_fan_adds_unique", prev),
      };
    } catch (e: any) {
      result.facebook = { error: e.message };
    }
  }

  // ── Instagram Business Account Insights ────────────────────────────────────
  if (igId) {
    try {
      const [igBasic, curr, prev] = await Promise.all([
        graphGet(`/${igId}?fields=followers_count,media_count`, token),
        graphGet(`/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${d30}&until=${now}`, token),
        graphGet(`/${igId}/insights?metric=reach,impressions&period=day&since=${d60}&until=${d30}`, token),
      ]);

      const get = (name: string, src: any) =>
        sumValues(src.data?.find((d: any) => d.name === name));

      result.instagram = {
        reach:           get("reach", curr),
        impressions:     get("impressions", curr),
        profile_views:   get("profile_views", curr),
        total_followers: igBasic.followers_count ?? null,
        media_count:     igBasic.media_count ?? null,
        prev_reach:      get("reach", prev),
        prev_impressions: get("impressions", prev),
      };
    } catch (e: any) {
      result.instagram = { error: e.message };
    }
  }

  // Stamp last-synced timestamp
  await (supabase as any)
    .from("profiles")
    .update({ meta_token_synced_at: new Date().toISOString() })
    .eq("id", clientId);

  return NextResponse.json(result);
}
