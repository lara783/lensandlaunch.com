"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Proposal } from "@/lib/supabase/types";
import Link from "next/link";
import {
  CheckCircle2, PenLine, X, Layers, DollarSign,
  CalendarDays, ArrowRight, Sparkles, ChevronRight, ArrowLeft, Pencil,
} from "lucide-react";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function extractPrice(body: string): string | null {
  const match = body.match(/\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:month|mth|mo))?/i);
  return match ? match[0] : null;
}

function parseBullets(body: string): { bullets: string[]; prose: string } {
  const lines = body.split("\n");
  const bullets: string[] = [];
  const proseLines: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^[-•*]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
      bullets.push(t.replace(/^[-•*\d.]+\s*/, ""));
    } else {
      proseLines.push(t);
    }
  }
  return { bullets, prose: proseLines.join("\n\n") };
}

function sectionMeta(heading: string): { type: string; icon: React.ReactNode } {
  const h = heading.toLowerCase();
  if (/invest|pric|cost|package/.test(h))           return { type: "investment", icon: <DollarSign size={14} /> };
  if (/scope|deliver|creat|what we/.test(h))        return { type: "scope",      icon: <Layers size={14} /> };
  if (/timeline|schedule|phase|when/.test(h))       return { type: "timeline",   icon: <CalendarDays size={14} /> };
  if (/next step|how we|get start|proceed/.test(h)) return { type: "nextsteps",  icon: <ArrowRight size={14} /> };
  if (/overview|about|intro/.test(h))               return { type: "overview",   icon: <Sparkles size={14} /> };
  return { type: "default", icon: <ChevronRight size={14} /> };
}

/* ── Section renderers ───────────────────────────────────────────────────── */

function InvestmentSection({ body }: { body: string }) {
  const price = extractPrice(body);
  const { prose } = parseBullets(body);
  return (
    <div className="rounded-3xl overflow-hidden w-full" style={{ boxShadow: "0 8px 48px rgba(1,1,1,0.10)" }}>
      <div className="px-8 md:px-12 pt-10 pb-8 relative" style={{ background: "#010101" }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-10"
          style={{ background: "radial-gradient(circle, #9c847a 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#9c847a", fontFamily: "var(--font-body)" }}>
          Total Investment
        </p>
        {price && (
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem, 6vw, 4rem)", color: "#fff", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {price}
          </p>
        )}
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>
          All-inclusive package — no hidden extras
        </p>
      </div>
      {(prose || (!price && body)) && (
        <div className="px-8 md:px-12 py-6" style={{ background: "rgba(1,1,1,0.02)", borderTop: "1px solid rgba(156,132,122,0.15)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            {prose || body}
          </p>
        </div>
      )}
    </div>
  );
}

function ScopeSection({ body }: { body: string }) {
  const { bullets, prose } = parseBullets(body);
  return (
    <div className="w-full rounded-3xl p-8 md:p-10" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
      {prose && (
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{prose}</p>
      )}
      {bullets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bullets.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: "rgba(156,132,122,0.06)", border: "1px solid rgba(156,132,122,0.14)" }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--ll-taupe)" }} />
              <span className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{b}</span>
            </motion.div>
          ))}
        </div>
      ) : !prose ? (
        <p className="text-sm leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{body}</p>
      ) : null}
    </div>
  );
}

function TimelineSection({ body }: { body: string }) {
  const { bullets, prose } = parseBullets(body);
  const steps = bullets.length > 0 ? bullets : body.split("\n\n").filter(Boolean);
  return (
    <div className="w-full rounded-3xl p-8 md:p-10" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
      {prose && bullets.length > 0 && (
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{prose}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
        {steps.map((step, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: i === 0 ? "#010101" : "rgba(156,132,122,0.12)", color: i === 0 ? "#fff" : "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                {i + 1}
              </div>
              {i < steps.length - 1 && <div className="w-px flex-1 my-1.5" style={{ background: "var(--border)", minHeight: 20 }} />}
            </div>
            <div className="pb-5 pt-1.5 min-w-0">
              <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{step}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NextStepsSection({ body }: { body: string }) {
  const { bullets, prose } = parseBullets(body);
  return (
    <div className="w-full rounded-3xl p-8 md:p-10"
      style={{ background: "linear-gradient(135deg, #ede8e4 0%, #f5f2ef 100%)", border: "1px solid rgba(156,132,122,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
      {(prose || bullets.length === 0) && (
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{prose || body}</p>
      )}
      {bullets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {bullets.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(156,132,122,0.15)" }}>
              <ArrowRight size={13} style={{ color: "var(--ll-taupe)", flexShrink: 0 }} />
              <span className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{b}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function DefaultSection({ body }: { body: string }) {
  const { bullets, prose } = parseBullets(body);
  return (
    <div className="w-full rounded-3xl p-8 md:p-10" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
      {(prose || bullets.length === 0) && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{prose || body}</p>
      )}
      {bullets.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(156,132,122,0.04)", border: "1px solid rgba(156,132,122,0.1)" }}>
              <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "var(--ll-taupe)" }} />
              <span className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Signature pad ───────────────────────────────────────────────────────── */
function SignaturePad({ onSign, loading }: { onSign: (dataUrl: string) => void; loading: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width), y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height) };
    return { x: ((e as React.MouseEvent).clientX - rect.left) * (canvas.width / rect.width), y: ((e as React.MouseEvent).clientY - rect.top) * (canvas.height / rect.height) };
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault(); drawing.current = true;
    const ctx = canvas.getContext("2d")!; const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#010101";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke(); setHasStrokes(true);
  }
  function stopDraw() { drawing.current = false; }
  function clear() {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height); setHasStrokes(false);
  }
  function submit() {
    const canvas = canvasRef.current; if (!canvas || !hasStrokes) return;
    onSign(canvas.toDataURL("image/png"));
  }

  return (
    <div>
      <div className="rounded-2xl overflow-hidden mb-3" style={{ border: "2px solid var(--border)", background: "#fff", touchAction: "none" }}>
        <canvas ref={canvasRef} width={560} height={150} className="w-full" style={{ cursor: "crosshair", display: "block" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
        Draw your signature above — mouse or finger.
      </p>
      <div className="flex gap-3">
        <button onClick={clear} className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
          Clear
        </button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={!hasStrokes || loading}
          className="flex-1 py-2 rounded-xl text-sm font-semibold"
          style={{ background: hasStrokes && !loading ? "#010101" : "var(--secondary)", color: hasStrokes && !loading ? "#fff" : "var(--ll-grey)", fontFamily: "var(--font-body)", cursor: hasStrokes && !loading ? "pointer" : "not-allowed" }}>
          {loading ? "Submitting…" : "Sign & Accept"}
        </motion.button>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
interface AdminNav {
  proposalId: string;
  canEdit: boolean;
}

export default function ProposalViewClient({
  proposal: initial,
  adminNav,
}: {
  proposal: Proposal;
  adminNav?: AdminNav;
}) {
  const [proposal, setProposal] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const supabase = createClient();

  const isPending = proposal.status === "sent";
  const statusColor = proposal.status === "accepted" ? "#276749" : proposal.status === "declined" ? "#c53030" : "#9c847a";

  function scrollToSection(i: number) {
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(i);
  }

  async function decline() {
    setLoading(true);
    const { error } = await supabase.from("proposals").update({ status: "declined" }).eq("id", proposal.id);
    if (error) toast.error("Something went wrong.");
    else { setProposal({ ...proposal, status: "declined" }); toast.success("Proposal declined."); }
    setLoading(false);
  }

  async function signAndAccept(signatureData: string) {
    setLoading(true);
    const { error } = await (supabase as any)
      .from("proposals")
      .update({ status: "accepted", signature_data: signatureData, signed_at: new Date().toISOString() })
      .eq("id", proposal.id);
    if (error) toast.error("Something went wrong.");
    else { setProposal({ ...proposal, status: "accepted" }); setShowSignature(false); toast.success("Signed and accepted — we'll be in touch!"); }
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>

      {/* ── Hero header ── */}
      <div style={{ background: "linear-gradient(160deg, #f5f2ef 0%, #ede8e4 60%, #e4ddd7 100%)", borderBottom: "1px solid rgba(156,132,122,0.15)" }}>

        {/* Admin nav row */}
        {adminNav && (
          <div className="flex items-center justify-between px-6 md:px-10 pt-5 pb-0">
            <Link href="/admin/proposals/new"
              className="flex items-center gap-1.5 text-[11px] font-semibold"
              style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
              <ArrowLeft size={12} />
              All proposals
            </Link>
            {adminNav.canEdit && (
              <Link href={`/admin/proposals/${adminNav.proposalId}/edit`}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(1,1,1,0.06)", color: "var(--foreground)", fontFamily: "var(--font-body)", border: "1px solid rgba(1,1,1,0.08)" }}>
                <Pencil size={11} />
                Edit proposal
              </Link>
            )}
          </div>
        )}

        <div className="px-6 md:px-10 pt-8 pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: "#9c847a", fontFamily: "var(--font-body)" }}>
            Lens &amp; Launch Media
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", color: "#010101", lineHeight: 1.15, marginBottom: "1rem", maxWidth: 700 }}>
            {proposal.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              {new Date(proposal.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <span className="w-1 h-1 rounded-full" style={{ background: "var(--ll-taupe)" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: `${statusColor}18`, color: statusColor, fontFamily: "var(--font-body)" }}>
              {proposal.status}
            </span>
            {proposal.pdf_url && (
              <>
                <span className="w-1 h-1 rounded-full" style={{ background: "var(--ll-taupe)" }} />
                <a href={proposal.pdf_url} download target="_blank" rel="noreferrer"
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                  Download PDF <ArrowRight size={10} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Horizontal section nav */}
        <div className="px-4 md:px-10 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-1 pb-0" style={{ minWidth: "max-content" }}>
            {proposal.content.map((s, i) => (
              <button
                key={i}
                onClick={() => scrollToSection(i)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap"
                style={{
                  background: activeSection === i ? "#fff" : "transparent",
                  color: activeSection === i ? "#010101" : "var(--ll-grey)",
                  fontFamily: "var(--font-body)",
                  borderBottom: activeSection === i ? "2px solid #9c847a" : "2px solid transparent",
                  boxShadow: activeSection === i ? "0 -2px 8px rgba(0,0,0,0.04)" : "none",
                }}
              >
                <span className="text-[9px] font-bold" style={{ color: activeSection === i ? "#9c847a" : "rgba(0,0,0,0.2)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.heading}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="flex-1 px-6 md:px-10 py-8 space-y-10 pb-32">
        {proposal.content.map((section, i) => {
          const { type, icon } = sectionMeta(section.heading);
          return (
            <div
              key={i}
              ref={(el) => { sectionRefs.current[i] = el; }}
              onClick={() => setActiveSection(i)}
            >
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2.5 mb-4"
              >
                <span style={{ color: "var(--ll-taupe)" }}>{icon}</span>
                <h2 className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  {section.heading}
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.04, type: "spring", stiffness: 260, damping: 28 }}
              >
                {type === "investment" && <InvestmentSection body={section.body} />}
                {type === "scope"      && <ScopeSection      body={section.body} />}
                {type === "timeline"   && <TimelineSection   body={section.body} />}
                {type === "nextsteps"  && <NextStepsSection  body={section.body} />}
                {(type === "overview" || type === "default") && <DefaultSection body={section.body} />}
              </motion.div>
            </div>
          );
        })}

        {/* Accepted signature block */}
        {proposal.status === "accepted" && (proposal as any).signature_data && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-7 w-full"
            style={{ background: "rgba(39,103,73,0.04)", border: "1px solid rgba(39,103,73,0.15)" }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} style={{ color: "#276749" }} />
              <p className="text-sm font-semibold" style={{ color: "#276749", fontFamily: "var(--font-body)" }}>Signed & Accepted</p>
            </div>
            <img src={(proposal as any).signature_data} alt="Signature"
              className="max-h-16 rounded-xl p-2" style={{ background: "#fff", border: "1px solid rgba(39,103,73,0.15)" }} />
            {(proposal as any).signed_at && (
              <p className="text-xs mt-2" style={{ color: "#276749", fontFamily: "var(--font-body)", opacity: 0.8 }}>
                {new Date((proposal as any).signed_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </motion.div>
        )}

        {/* Declined block */}
        {proposal.status === "declined" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-3xl px-7 py-5 w-full"
            style={{ background: "rgba(229,62,62,0.04)", border: "1px solid rgba(229,62,62,0.12)" }}>
            <p className="text-sm" style={{ color: "#c53030", fontFamily: "var(--font-body)" }}>
              You declined this proposal. Reach out if you&apos;d like to revisit it.
            </p>
          </motion.div>
        )}
      </div>

      {/* ── Sticky bottom CTA ── */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-30 md:left-16"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(16px)",
              borderTop: "1px solid rgba(156,132,122,0.2)",
              padding: "16px 24px",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center gap-3 max-w-2xl mx-auto">
              <button
                onClick={decline}
                disabled={loading}
                className="px-5 py-3 rounded-2xl text-sm font-semibold shrink-0"
                style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                Not right for me
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSignature(true)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <PenLine size={15} />
                Accept &amp; Sign Proposal
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Signature modal ── */}
      <AnimatePresence>
        {showSignature && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
              onClick={() => setShowSignature(false)} />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-8 md:left-16"
              style={{ background: "#fff", boxShadow: "0 -12px 48px rgba(0,0,0,0.12)", maxWidth: 680, margin: "0 auto", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "#010101" }}>
                    Sign to accept
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                    By signing you confirm you&apos;ve read and agree to this proposal.
                  </p>
                </div>
                <button onClick={() => setShowSignature(false)} className="p-2 rounded-xl"
                  style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="mb-5" style={{ height: 1, background: "var(--border)" }} />
              <SignaturePad onSign={signAndAccept} loading={loading} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
