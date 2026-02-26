import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/deliverables/record-video
// Body: { deliverableId, videoUrl }
// Called after the browser has already uploaded the video directly to Supabase Storage.
// Just creates/updates the deliverable_reviews row with the public URL.

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const { data: profile } = await (supabase as any).from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { deliverableId, videoUrl } = await req.json();
    if (!deliverableId || !videoUrl) {
      return NextResponse.json({ error: "Missing deliverableId or videoUrl" }, { status: 400 });
    }

    const { data: existing } = await (supabase as any)
      .from("deliverable_reviews")
      .select("id")
      .eq("deliverable_id", deliverableId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let review: any;
    if (existing) {
      const { data } = await (supabase as any)
        .from("deliverable_reviews")
        .update({ video_url: videoUrl, status: "pending", annotations: [], reviewed_at: null, reviewer_note: null })
        .eq("id", existing.id)
        .select()
        .single();
      review = data;
    } else {
      const { data } = await (supabase as any)
        .from("deliverable_reviews")
        .insert({ deliverable_id: deliverableId, video_url: videoUrl })
        .select()
        .single();
      review = data;
    }

    return NextResponse.json({ ok: true, review });
  } catch (err: any) {
    console.error("[record-video]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
