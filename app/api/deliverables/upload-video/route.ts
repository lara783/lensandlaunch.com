import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/deliverables/upload-video
// Body: FormData with fields: deliverableId, file (video)
// Admin only — uploads to deliverable-videos bucket and creates/updates a deliverable_review row.

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const { data: profile } = await (supabase as any).from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const form = await req.formData();
    const deliverableId = form.get("deliverableId") as string;
    const file = form.get("file") as File | null;

    if (!deliverableId || !file) {
      return NextResponse.json({ error: "Missing deliverableId or file" }, { status: 400 });
    }

    // Upload to Supabase storage
    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${deliverableId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("deliverable-videos")
      .upload(path, buffer, { contentType: file.type, cacheControl: "3600", upsert: true });

    if (uploadErr) {
      console.error("[upload-video] Storage error:", uploadErr);
      const msg = uploadErr.message?.toLowerCase().includes("bucket")
        ? "Storage bucket 'deliverable-videos' not found — go to Documents tab and click 'Setup storage buckets' first."
        : uploadErr.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from("deliverable-videos").getPublicUrl(path);

    // Create or update the deliverable_review row
    const { data: existing } = await (supabase as any)
      .from("deliverable_reviews")
      .select("id")
      .eq("deliverable_id", deliverableId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let review: any;
    if (existing) {
      const { data, error: updErr } = await (supabase as any)
        .from("deliverable_reviews")
        .update({ video_url: publicUrl, status: "pending", annotations: [], reviewed_at: null, reviewer_note: null })
        .eq("id", existing.id)
        .select()
        .single();
      if (updErr) console.error("[upload-video] Review update error:", updErr);
      review = data;
    } else {
      const { data, error: insErr } = await (supabase as any)
        .from("deliverable_reviews")
        .insert({ deliverable_id: deliverableId, video_url: publicUrl })
        .select()
        .single();
      if (insErr) console.error("[upload-video] Review insert error:", insErr);
      review = data;
    }

    return NextResponse.json({ ok: true, videoUrl: publicUrl, review });
  } catch (err: any) {
    console.error("[upload-video] Unhandled error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
