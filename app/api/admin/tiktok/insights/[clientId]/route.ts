import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://open.tiktokapis.com/v2";
const TOKEN_URL = `${API_BASE}/oauth/token/`;

async function refreshToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (data.error !== "ok" || !data.data?.access_token) return null;
  return { access_token: data.data.access_token, refresh_token: data.data.refresh_token };
}

async function tiktokGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.json();
}

async function tiktokPost(path: string, token: string, body: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return res.json();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("tiktok_access_token, tiktok_refresh_token, tiktok_open_id")
    .eq("id", clientId)
    .single();

  if (!(profile as any)?.tiktok_access_token) {
    return NextResponse.json({ error: "No TikTok access token configured for this client" }, { status: 400 });
  }

  let accessToken = (profile as any).tiktok_access_token as string;
  let newRefreshToken = (profile as any).tiktok_refresh_token as string | null;

  // Proactively refresh — TikTok access tokens expire after 24 hours
  if (newRefreshToken) {
    const refreshed = await refreshToken(newRefreshToken);
    if (refreshed) {
      accessToken = refreshed.access_token;
      newRefreshToken = refreshed.refresh_token;
      await admin.from("profiles").update({
        tiktok_access_token: accessToken,
        tiktok_refresh_token: newRefreshToken,
      }).eq("id", clientId);
    }
  }

  try {
    const fields = "open_id,display_name,follower_count,following_count,likes_count,video_count";
    const videoFields = "id,play_count,like_count,comment_count,share_count,view_count,create_time,share_url";

    const [userInfoRes, videoListRes] = await Promise.all([
      tiktokGet(`/user/info/?fields=${fields}`, accessToken),
      tiktokPost(`/video/list/?fields=${videoFields}`, accessToken, { max_count: 20 }),
    ]);

    if (userInfoRes.error?.code && userInfoRes.error.code !== "ok") {
      return NextResponse.json(
        { error: userInfoRes.error.message ?? "TikTok user info error" },
        { status: 400 }
      );
    }

    const userInfo = userInfoRes.data?.user ?? {};
    const allVideos: any[] = videoListRes.data?.videos ?? [];

    // Filter to videos posted in the last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
    const recentVideos = allVideos.filter((v: any) => (v.create_time ?? 0) >= thirtyDaysAgo);

    // Aggregate reach/engagement from recent videos
    const reach = recentVideos.reduce((s: number, v: any) => s + (v.play_count ?? 0), 0);
    const impressions = recentVideos.reduce((s: number, v: any) => s + (v.view_count ?? v.play_count ?? 0), 0);
    const totalLikes = recentVideos.reduce((s: number, v: any) => s + (v.like_count ?? 0), 0);
    const totalComments = recentVideos.reduce((s: number, v: any) => s + (v.comment_count ?? 0), 0);
    const totalShares = recentVideos.reduce((s: number, v: any) => s + (v.share_count ?? 0), 0);
    const totalEngagements = totalLikes + totalComments + totalShares;
    const engagementRate =
      impressions > 0 ? Number(((totalEngagements / impressions) * 100).toFixed(2)) : null;

    const topVideo = [...recentVideos].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))[0];

    // Stamp sync time
    await admin.from("profiles").update({
      tiktok_token_synced_at: new Date().toISOString(),
    }).eq("id", clientId);

    return NextResponse.json({
      tiktok: {
        reach: reach || null,
        impressions: impressions || null,
        total_followers: userInfo.follower_count ?? null,
        likes_count: userInfo.likes_count ?? null,
        video_count: userInfo.video_count ?? null,
        engagement_rate: engagementRate,
        top_post_url: topVideo?.share_url ?? null,
        video_count_30d: recentVideos.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
