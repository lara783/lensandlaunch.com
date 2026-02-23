import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  // Admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const buckets = [
    { name: "documents", public: true },
    { name: "assets", public: true },
  ];

  const results = [];
  for (const bucket of buckets) {
    const { error } = await serviceClient.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: undefined, // allow all
    });
    // "already exists" error is fine
    const alreadyExists = error?.message?.includes("already exists");
    results.push({
      bucket: bucket.name,
      status: error && !alreadyExists ? "error" : "ok",
      note: alreadyExists ? "already existed" : error ? error.message : "created",
    });
  }

  return NextResponse.json({ results });
}
