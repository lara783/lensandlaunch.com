"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Circle, Rect, Transformer } from "react-konva";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Circle as CircleIcon, Square, Trash2, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import type { VideoAnnotation, DeliverableReview } from "@/lib/supabase/types";

interface Props {
  deliverableId: string;
  deliverableTitle: string;
  review: DeliverableReview;
  isAdmin: boolean;
  onClose: () => void;
  onStatusChange?: (status: DeliverableReview["status"]) => void;
}

type DrawMode = "circle" | "rect" | "select";

const ANNOTATION_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#9c847a"];

export default function VideoReviewModal({
  deliverableId, deliverableTitle, review: initReview, isAdmin, onClose, onStatusChange,
}: Props) {
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);

  const [review, setReview] = useState(initReview);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>(initReview.annotations ?? []);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stageSize, setStageSize] = useState({ w: 640, h: 360 });
  const [drawMode, setDrawMode] = useState<DrawMode>("select");
  const [drawColor, setDrawColor] = useState(ANNOTATION_COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [pendingShape, setPendingShape] = useState<Partial<VideoAnnotation> | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewerNote, setReviewerNote] = useState(initReview.reviewer_note ?? "");

  // Resize stage to match video dimensions
  useEffect(() => {
    function updateSize() {
      if (stageContainerRef.current) {
        const w = stageContainerRef.current.offsetWidth;
        const h = Math.round(w * (9 / 16));
        setStageSize({ w, h });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const visibleAnnotations = annotations.filter(
    (a) => Math.abs(a.timestamp_seconds - currentTime) < 0.5 || isPlaying === false
  );

  function pauseVideo() {
    videoRef.current?.pause();
    setIsPlaying(false);
  }

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else { videoRef.current.play(); setIsPlaying(true); }
  }

  function handleMouseDown(e: any) {
    if (drawMode === "select") return;
    pauseVideo();
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setIsDrawing(true);
    setDrawStart(pos);
    setPendingShape({
      id: crypto.randomUUID(),
      timestamp_seconds: currentTime,
      shape: drawMode,
      x: pos.x,
      y: pos.y,
      w: 0,
      h: 0,
      color: drawColor,
      note: "",
      created_by: "",
      created_at: new Date().toISOString(),
    });
  }

  function handleMouseMove(e: any) {
    if (!isDrawing || !pendingShape) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const w = pos.x - drawStart.x;
    const h = pos.y - drawStart.y;
    setPendingShape((prev) => prev ? { ...prev, w, h } : prev);
  }

  function handleMouseUp() {
    if (!isDrawing || !pendingShape) return;
    setIsDrawing(false);
    const hasSize = Math.abs(pendingShape.w ?? 0) > 10 || Math.abs(pendingShape.h ?? 0) > 10;
    if (hasSize) {
      // Keep pendingShape set — commitAnnotation reads it when the user clicks Add
      setSelectedAnnotationId(pendingShape.id ?? null);
      setShowNoteInput(true);
    } else {
      // Too small to be intentional — discard
      setPendingShape(null);
    }
  }

  function commitAnnotation(note: string) {
    if (!pendingShape) return;
    const newAnnotation: VideoAnnotation = {
      id: pendingShape.id ?? crypto.randomUUID(),
      timestamp_seconds: pendingShape.timestamp_seconds ?? currentTime,
      shape: (pendingShape.shape as "circle" | "rect") ?? "rect",
      x: pendingShape.x ?? 0,
      y: pendingShape.y ?? 0,
      w: pendingShape.w ?? 0,
      h: pendingShape.h ?? 0,
      color: pendingShape.color ?? drawColor,
      note,
      created_by: "",
      created_at: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    setShowNoteInput(false);
    setNoteInput("");
    setPendingShape(null);
    setSelectedAnnotationId(null);
  }

  function deleteAnnotation(id: string) {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }

  async function saveAnnotations() {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("deliverable_reviews")
      .update({ annotations })
      .eq("id", review.id);
    setSaving(false);
    if (error) toast.error("Failed to save annotations.");
    else toast.success("Annotations saved.");
  }

  async function submitReview(status: "approved" | "changes_requested") {
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("deliverable_reviews")
      .update({ annotations, status, reviewer_note: reviewerNote.trim() || null, reviewed_at: new Date().toISOString() })
      .eq("id", review.id)
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error("Failed to submit review."); return; }
    setReview(data);
    onStatusChange?.(status);
    toast.success(status === "approved" ? "Video approved!" : "Changes requested — Lara has been notified.");
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 8,
    color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "0.875rem",
    padding: "0.5rem 0.75rem", outline: "none", width: "100%",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-stretch"
        style={{ background: "rgba(0,0,0,0.85)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col md:flex-row w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: Video + Canvas */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{deliverableTitle}</p>
                <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {review.status === "pending" ? "Awaiting review" : review.status === "approved" ? "Approved" : "Changes requested"}
                </p>
              </div>
              <button onClick={onClose} style={{ color: "var(--ll-grey)" }}><X size={18} /></button>
            </div>

            {/* Video + overlay */}
            <div ref={stageContainerRef} className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
              <video
                ref={videoRef}
                src={review.video_url}
                className="absolute inset-0 w-full h-full object-contain"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              {/* Konva canvas overlay */}
              <div className="absolute inset-0" style={{ pointerEvents: drawMode !== "select" || !isPlaying ? "auto" : "none" }}>
                <Stage
                  width={stageSize.w}
                  height={stageSize.h}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{ cursor: drawMode !== "select" ? "crosshair" : "default" }}
                >
                  <Layer>
                    {/* Visible annotations */}
                    {visibleAnnotations.map((a) =>
                      a.shape === "circle" ? (
                        <Circle
                          key={a.id}
                          x={a.x + a.w / 2}
                          y={a.y + a.h / 2}
                          radius={Math.max(Math.abs(a.w), Math.abs(a.h)) / 2}
                          stroke={a.color}
                          strokeWidth={2.5}
                          fill="transparent"
                          onClick={() => setSelectedAnnotationId(a.id)}
                        />
                      ) : (
                        <Rect
                          key={a.id}
                          x={Math.min(a.x, a.x + a.w)}
                          y={Math.min(a.y, a.y + a.h)}
                          width={Math.abs(a.w)}
                          height={Math.abs(a.h)}
                          stroke={a.color}
                          strokeWidth={2.5}
                          fill="transparent"
                          onClick={() => setSelectedAnnotationId(a.id)}
                        />
                      )
                    )}
                    {/* Pending shape being drawn */}
                    {pendingShape && pendingShape.shape === "circle" && (
                      <Circle
                        x={(pendingShape.x ?? 0) + (pendingShape.w ?? 0) / 2}
                        y={(pendingShape.y ?? 0) + (pendingShape.h ?? 0) / 2}
                        radius={Math.max(Math.abs(pendingShape.w ?? 0), Math.abs(pendingShape.h ?? 0)) / 2}
                        stroke={drawColor}
                        strokeWidth={2.5}
                        fill="transparent"
                        dash={[6, 3]}
                      />
                    )}
                    {pendingShape && pendingShape.shape === "rect" && (
                      <Rect
                        x={Math.min(pendingShape.x ?? 0, (pendingShape.x ?? 0) + (pendingShape.w ?? 0))}
                        y={Math.min(pendingShape.y ?? 0, (pendingShape.y ?? 0) + (pendingShape.h ?? 0))}
                        width={Math.abs(pendingShape.w ?? 0)}
                        height={Math.abs(pendingShape.h ?? 0)}
                        stroke={drawColor}
                        strokeWidth={2.5}
                        fill="transparent"
                        dash={[6, 3]}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>

            {/* Video controls */}
            <div className="px-4 py-3 space-y-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const t = parseFloat(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = t;
                  setCurrentTime(t);
                }}
                className="w-full"
                style={{ accentColor: "var(--ll-taupe)" }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Drawing tools */}
                <div className="flex items-center gap-2">
                  {([["select", "Select"], ["circle", "Circle"], ["rect", "Rectangle"]] as [DrawMode, string][]).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setDrawMode(mode)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                      style={{
                        background: drawMode === mode ? "#010101" : "var(--secondary)",
                        color: drawMode === mode ? "#fff" : "var(--ll-grey)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  {/* Color picker */}
                  <div className="flex items-center gap-1 ml-2">
                    {ANNOTATION_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDrawColor(c)}
                        className="w-4 h-4 rounded-full"
                        style={{
                          background: c,
                          outline: drawColor === c ? `2px solid #fff` : "none",
                          outlineOffset: 1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Note input after drawing */}
            <AnimatePresence>
              {showNoteInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 space-y-2"
                  style={{ background: "rgba(156,132,122,0.06)", borderBottom: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                    Add a note for this annotation (optional)
                  </p>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      placeholder="Describe what needs to change…"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && commitAnnotation(noteInput)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => commitAnnotation(noteInput)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowNoteInput(false); setNoteInput(""); setPendingShape(null); }}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Annotation list + review actions */}
          <div className="w-full md:w-80 flex flex-col shrink-0" style={{ borderLeft: "1px solid var(--border)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                Annotations ({annotations.length})
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {annotations.length === 0 && (
                <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  Pause the video then draw a circle or rectangle to add feedback.
                </p>
              )}
              {annotations.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-2 p-3 rounded-xl cursor-pointer"
                  style={{
                    background: selectedAnnotationId === a.id ? "rgba(156,132,122,0.12)" : "var(--secondary)",
                    border: `1px solid ${selectedAnnotationId === a.id ? "var(--ll-taupe)" : "var(--border)"}`,
                  }}
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = a.timestamp_seconds;
                    setCurrentTime(a.timestamp_seconds);
                    setSelectedAnnotationId(a.id);
                  }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ background: a.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                      {formatTime(a.timestamp_seconds)} · {a.shape}
                    </p>
                    {a.note && (
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                        {a.note}
                      </p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(a.id); }} style={{ color: "#c53030", flexShrink: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Review note + actions */}
            <div className="px-4 py-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
              {review.status === "pending" && (
                <>
                  <textarea
                    placeholder="Overall notes for the team (optional)…"
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, resize: "none", fontSize: "0.75rem" }}
                  />

                  {annotations.length > 0 && (
                    <button
                      onClick={saveAnnotations}
                      disabled={saving}
                      className="w-full text-xs font-semibold py-2 rounded-xl"
                      style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                    >
                      {saving ? "Saving…" : "Save annotations"}
                    </button>
                  )}

                  <button
                    onClick={() => submitReview("changes_requested")}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#c53030", border: "1px solid rgba(239,68,68,0.2)", fontFamily: "var(--font-body)" }}
                  >
                    <AlertCircle size={14} /> Request changes
                  </button>

                  <button
                    onClick={() => submitReview("approved")}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl"
                    style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
                  >
                    <CheckCircle2 size={14} /> Approve video
                  </button>
                </>
              )}

              {review.status !== "pending" && (
                <div
                  className="px-4 py-3 rounded-xl text-center"
                  style={{
                    background: review.status === "approved" ? "rgba(39,103,73,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${review.status === "approved" ? "rgba(39,103,73,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: review.status === "approved" ? "#276749" : "#c53030", fontFamily: "var(--font-body)" }}>
                    {review.status === "approved" ? "Video approved" : "Changes requested"}
                  </p>
                  {review.reviewer_note && (
                    <p className="text-xs mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{review.reviewer_note}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
