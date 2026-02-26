"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Play, CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { Deliverable, DeliverableReview } from "@/lib/supabase/types";

const VideoReviewModal = dynamic(
  () => import("@/components/deliverables/VideoReviewModal"),
  { ssr: false }
);

const CATEGORY_LABELS: Record<string, string> = {
  carousel:        "Carousel",
  static_post:     "Static Post",
  infographic:     "Infographic",
  video:           "Video",
  short_form_reel: "Short Form Reel",
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  carousel:        { bg: "rgba(171,166,150,0.15)", color: "#696348" },
  static_post:     { bg: "rgba(156,132,122,0.15)", color: "#9c847a" },
  infographic:     { bg: "rgba(194,186,155,0.15)", color: "#867373" },
  video:           { bg: "rgba(1,1,1,0.07)",       color: "#010101" },
  short_form_reel: { bg: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)" },
};

interface Props {
  deliverable: Deliverable;
  review: DeliverableReview | null;
  projectName: string;
}

export default function DeliverableDetailClient({ deliverable: init, review: initReview, projectName }: Props) {
  const [deliverable, setDeliverable] = useState(init);
  const [review, setReview] = useState(initReview);
  const [showReview, setShowReview] = useState(false);
  const [approving, setApproving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function toggleApproval() {
    if (!deliverable.agency_approved) return;
    setApproving(true);
    const newVal = !deliverable.client_approved;
    setDeliverable((prev) => ({ ...prev, client_approved: newVal }));
    await supabase.from("deliverables").update({ client_approved: newVal }).eq("id", deliverable.id);
    setApproving(false);
    toast.success(newVal ? "Deliverable approved!" : "Approval removed.");
    router.refresh();
  }

  const cat = deliverable.category;
  const catStyle = cat ? CATEGORY_COLORS[cat] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      {/* Back */}
      <Link
        href="/deliverables"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
        style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
      >
        <ArrowLeft size={14} /> Back to Deliverables
      </Link>

      {/* Title + category */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 4vw, 1.9rem)", color: "var(--foreground)", lineHeight: 1.2 }}>
          {deliverable.title}
        </h1>
        {cat && catStyle && (
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold mt-1"
            style={{ background: catStyle.bg, color: catStyle.color, fontFamily: "var(--font-body)" }}>
            {CATEGORY_LABELS[cat]}
          </span>
        )}
      </div>

      {/* Orientation tags */}
      {deliverable.tags?.length > 0 && (
        <div className="flex gap-2 mb-5">
          {deliverable.tags.map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full capitalize"
              style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {deliverable.description && (
        <p className="text-sm leading-relaxed mb-6"
          style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          {deliverable.description}
        </p>
      )}

      {/* Due date */}
      {deliverable.due_date && (
        <p className="text-xs mb-5" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
          Due {new Date(deliverable.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}

      {/* Content link */}
      {deliverable.content_url && (
        <div className="mb-6">
          <a
            href={deliverable.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            <ExternalLink size={14} /> View Deliverable
          </a>
        </div>
      )}

      {/* Video review */}
      {review && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Video Review
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
              background: review.status === "approved" ? "rgba(39,103,73,0.08)" : review.status === "changes_requested" ? "rgba(239,68,68,0.08)" : "rgba(156,132,122,0.12)",
              color: review.status === "approved" ? "#276749" : review.status === "changes_requested" ? "#c53030" : "var(--ll-taupe)",
              fontFamily: "var(--font-body)",
            }}>
              {review.status === "approved" ? "Approved" : review.status === "changes_requested" ? "Changes requested" : "Awaiting review"}
            </span>
            <button
              onClick={() => setShowReview(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl"
              style={{
                background: "rgba(156,132,122,0.12)",
                color: "var(--ll-taupe)",
                border: "1px solid rgba(156,132,122,0.2)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Play size={12} /> {review.status === "pending" ? "Review & annotate" : "View video"}
            </button>
          </div>
          {review.reviewer_note && (
            <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              Note: {review.reviewer_note}
            </p>
          )}
        </div>
      )}

      {/* Approval status */}
      <div className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          Status
        </p>
        <div className="flex items-center gap-6 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            {deliverable.agency_approved
              ? <CheckCircle2 size={16} style={{ color: "var(--ll-taupe)" }} />
              : <Circle size={16} style={{ color: "var(--ll-grey)" }} />
            }
            <span className="text-sm" style={{
              color: deliverable.agency_approved ? "var(--ll-taupe)" : "var(--ll-grey)",
              fontFamily: "var(--font-body)",
              fontWeight: deliverable.agency_approved ? 600 : 400,
            }}>
              Lens &amp; Launch {deliverable.agency_approved ? "complete" : "in progress"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {deliverable.client_approved
              ? <CheckCircle2 size={16} style={{ color: "#276749" }} />
              : <Circle size={16} style={{ color: "var(--ll-grey)" }} />
            }
            <span className="text-sm" style={{
              color: deliverable.client_approved ? "#276749" : "var(--ll-grey)",
              fontFamily: "var(--font-body)",
              fontWeight: deliverable.client_approved ? 600 : 400,
            }}>
              {deliverable.client_approved ? "You approved" : "Awaiting your approval"}
            </span>
          </div>
        </div>

        {deliverable.agency_approved && !deliverable.client_approved && (
          <button
            onClick={toggleApproval}
            disabled={approving}
            className="text-sm font-semibold px-5 py-2.5 rounded-xl"
            style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            {approving ? "Saving…" : "Approve deliverable"}
          </button>
        )}
        {deliverable.client_approved && (
          <button
            onClick={toggleApproval}
            disabled={approving}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            Remove approval
          </button>
        )}
        {!deliverable.agency_approved && (
          <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            You can approve once Lens &amp; Launch marks this deliverable complete.
          </p>
        )}
      </div>

      {/* Video review modal */}
      {showReview && review && (
        <VideoReviewModal
          deliverableId={deliverable.id}
          deliverableTitle={deliverable.title}
          review={review}
          isAdmin={false}
          onClose={() => setShowReview(false)}
          onStatusChange={(status) => setReview((prev) => prev ? { ...prev, status } : prev)}
        />
      )}
    </motion.div>
  );
}
