import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import DeliverableDetailClient from "./DeliverableDetailClient";

export default async function DeliverableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch deliverable
  const { data: deliverable } = await supabase
    .from("deliverables")
    .select("*")
    .eq("id", id)
    .single();

  if (!deliverable) redirect("/deliverables");

  // Verify ownership — deliverable must belong to the user's project
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", deliverable.project_id)
    .eq("client_id", user.id)
    .single();

  if (!project) redirect("/deliverables");

  // Fetch video review with signed URL using service role
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rawReview } = await serviceClient
    .from("deliverable_reviews")
    .select("*")
    .eq("deliverable_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let review = rawReview ?? null;
  if (rawReview?.video_url) {
    const match = rawReview.video_url.match(
      /\/storage\/v1\/object\/(?:public|sign)\/deliverable-videos\/([^?]+)/
    );
    if (match) {
      const { data: signed } = await serviceClient.storage
        .from("deliverable-videos")
        .createSignedUrl(decodeURIComponent(match[1]), 3600);
      if (signed?.signedUrl) review = { ...rawReview, video_url: signed.signedUrl };
    }
  }

  return (
    <div className="p-6 md:p-8 w-full">
      <DeliverableDetailClient
        deliverable={deliverable}
        review={review}
        projectName={project.name}
      />
    </div>
  );
}
