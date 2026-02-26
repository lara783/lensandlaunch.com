"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Proposal, PricingTier, ScopeItem, TimelineStep } from "@/lib/supabase/types";
import Link from "next/link";
import {
  CheckCircle2, X, Layers, DollarSign,
  CalendarDays, ArrowRight, Sparkles, ChevronRight, ArrowLeft, Pencil, FileDown, Loader2, Phone,
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

function InvestmentSection({ body, tiers }: { body: string; tiers?: PricingTier[] }) {
  if (tiers && tiers.length > 0) {
    return (
      <div className="rounded-3xl overflow-hidden w-full" style={{ boxShadow: "0 8px 48px rgba(1,1,1,0.10)" }}>
        {/* Dark header with intro prose */}
        <div className="px-8 md:px-12 pt-10 pb-8 relative" style={{ background: "#010101" }}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none opacity-10"
            style={{ background: "radial-gradient(circle, #9c847a 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#9c847a", fontFamily: "var(--font-body)" }}>
            Investment Options
          </p>
          {body && (
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-body)", maxWidth: 600 }}>
              {body}
            </p>
          )}
        </div>
        {/* 3-card tier grid */}
        <div className="grid grid-cols-3" style={{ background: "#fff" }}>
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex flex-col items-center text-center px-5 py-8 relative"
              style={{
                background: tier.highlighted ? "#fff" : "rgba(156,132,122,0.03)",
                borderLeft: i > 0 ? "1px solid rgba(156,132,122,0.15)" : "none",
                transform: tier.highlighted ? "scale(1.03)" : "none",
                zIndex: tier.highlighted ? 1 : 0,
                boxShadow: tier.highlighted ? "0 0 0 1.5px #9c847a" : "none",
                borderRadius: tier.highlighted ? 16 : 0,
              }}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
                  style={{ background: "#9c847a", color: "#fff", fontFamily: "var(--font-body)" }}>
                  Most popular
                </span>
              )}
              <p className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: tier.highlighted ? "#010101" : "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {tier.name}
              </p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", color: "#010101", lineHeight: 1.1 }}>
                ${tier.price.toLocaleString()}
              </p>
              {tier.period && (
                <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  /{tier.period}
                </p>
              )}
              {tier.tagline && (
                <p className="text-xs leading-relaxed mt-auto" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                  {tier.tagline}
                </p>
              )}
            </motion.div>
          ))}
        </div>
        {/* Payment terms */}
        {(() => {
          const period = tiers[0]?.period;
          const isRetainer = !period || period === "month";
          return (
            <div className="px-8 py-5" style={{ background: "rgba(1,1,1,0.02)", borderTop: "1px solid rgba(156,132,122,0.12)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#9c847a", fontFamily: "var(--font-body)" }}>
                Payment terms
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {isRetainer
                  ? "Payment is due in full at the start of each month. Your invoice will be sent 5 days prior."
                  : "A 50% booking deposit is required to confirm your project. The remaining 50% is due upon delivery of your watermarked content."}
              </p>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── Fallback: single-price display (backward compat) ──
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

const TIER_NAMES = ["Essential", "Growth", "Premium"];

function ScopeSection({ body, scopeItems }: { body: string; scopeItems?: ScopeItem[] }) {
  // ── Comparison table view ──
  if (scopeItems && scopeItems.length > 0) {
    return (
      <div className="w-full rounded-3xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
        {body && (
          <div className="px-7 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{body}</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#010101" }}>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-body)", width: "42%" }}>
                  What&apos;s included
                </th>
                {TIER_NAMES.map((name, i) => (
                  <th key={i} className="px-5 py-4 text-center"
                    style={{ fontFamily: "var(--font-body)", minWidth: 100 }}>
                    <span className="block text-xs font-bold uppercase tracking-widest"
                      style={{ color: i === 1 ? "#9c847a" : "rgba(255,255,255,0.75)" }}>
                      {name}
                    </span>
                    {i === 1 && (
                      <span className="block text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "#9c847a", opacity: 0.8 }}>
                        Most popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scopeItems.map((item, ri) => (
                <motion.tr
                  key={ri}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: ri * 0.03 }}
                  style={{ borderBottom: "1px solid var(--border)", background: ri % 2 === 0 ? "transparent" : "rgba(156,132,122,0.025)" }}
                >
                  <td className="px-6 py-3.5 text-sm font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                    {item.feature}
                  </td>
                  {[item.essential, item.growth, item.premium].map((val, ci) => (
                    <td key={ci} className="px-5 py-3.5 text-center text-sm" style={{ fontFamily: "var(--font-body)" }}>
                      {!val || val === "" ? (
                        <span style={{ color: "var(--ll-neutral)", fontSize: "1rem" }}>—</span>
                      ) : val === "✓" ? (
                        <span style={{ color: "var(--ll-taupe)", fontWeight: 700, fontSize: "1rem" }}>✓</span>
                      ) : (
                        <span style={{ color: ci === 1 ? "var(--ll-taupe)" : "var(--foreground)", fontWeight: ci === 1 ? 600 : 400 }}>
                          {val}
                        </span>
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Fallback: bullet/prose view (backward compat) ──
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

function TimelineSection({ body, timelineSteps }: { body: string; timelineSteps?: TimelineStep[] }) {
  // Structured steps take priority over prose parsing
  if (timelineSteps && timelineSteps.length > 0) {
    return (
      <div className="w-full rounded-3xl p-8 md:p-10" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
        {body && (
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{body}</p>
        )}
        <div className="space-y-0">
          {timelineSteps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className="flex gap-5">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)", border: "1.5px solid rgba(156,132,122,0.3)" }}>
                  {step.step}
                </div>
                {i < timelineSteps.length - 1 && <div className="w-px flex-1 my-2" style={{ background: "rgba(156,132,122,0.2)", minHeight: 24 }} />}
              </div>
              <div className="pb-7 pt-1.5 min-w-0">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{step.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

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

function NextStepsSection({ body, timelineSteps }: { body: string; timelineSteps?: TimelineStep[] }) {
  // Render numbered steps if present
  if (timelineSteps && timelineSteps.length > 0) {
    return (
      <div className="w-full rounded-3xl p-8 md:p-10"
        style={{ background: "linear-gradient(135deg, #ede8e4 0%, #f5f2ef 100%)", border: "1px solid rgba(156,132,122,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
        {body && (
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{body}</p>
        )}
        <div className="space-y-0">
          {timelineSteps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className="flex gap-5">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "rgba(156,132,122,0.15)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)", border: "1.5px solid rgba(156,132,122,0.3)" }}>
                  {step.step}
                </div>
                {i < timelineSteps.length - 1 && <div className="w-px flex-1 my-2" style={{ background: "rgba(156,132,122,0.3)", minHeight: 24 }} />}
              </div>
              <div className="pb-7 pt-1.5 min-w-0">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{step.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

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

/* ── Main component ──────────────────────────────────────────────────────── */
interface AdminNav {
  proposalId: string;
  canEdit: boolean;
  adminName?: string;
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
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [acceptName, setAcceptName] = useState("");
  const [acceptEmail, setAcceptEmail] = useState("");
  const [accepting, setAccepting] = useState(false);
  const investmentTiers = initial.content.flatMap((s: any) => s.tiers ?? []) as PricingTier[];
  const [selectedTier, setSelectedTier] = useState<string | null>(
    investmentTiers.find((t) => t.highlighted)?.name ?? investmentTiers[0]?.name ?? null
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(proposal.pdf_url);
  const [pdfGenerating, setPdfGenerating] = useState(false);
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
    if (error) { toast.error("Something went wrong."); setLoading(false); return; }
    setProposal({ ...proposal, status: "declined" });
    toast.success("Proposal declined.");
    setLoading(false);
    fetch("/api/hubspot/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.id, action: "declined" }),
    }).catch(() => {});
  }

  async function acceptProposal() {
    if (!acceptName.trim() || !acceptEmail.trim()) {
      toast.error("Please enter your full name and email address.");
      return;
    }
    if (investmentTiers.length > 0 && !selectedTier) {
      toast.error("Please choose a package.");
      return;
    }
    setAccepting(true);
    const now = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("proposals")
      .update({
        status: "accepted",
        signed_at: now,
        client_signature_name: acceptName.trim(),
        client_signature_email: acceptEmail.trim(),
        selected_tier_name: selectedTier,
      })
      .eq("id", proposal.id);
    if (error) { toast.error("Something went wrong."); setAccepting(false); return; }
    const updated = { ...proposal, status: "accepted" } as any;
    updated.signed_at = now;
    updated.client_signature_name = acceptName.trim();
    updated.client_signature_email = acceptEmail.trim();
    updated.selected_tier_name = selectedTier;
    setProposal(updated);
    setShowAcceptModal(false);
    toast.success("Proposal accepted — we'll be in touch!");
    setAccepting(false);
    fetch("/api/proposals/signed-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposalId: proposal.id,
        clientName: acceptName.trim(),
        clientEmail: acceptEmail.trim(),
        selectedTier: selectedTier,
        signedAt: now,
      }),
    }).catch(() => {});
    fetch("/api/proposals/provision-deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.id }),
    }).catch(() => {});
    fetch("/api/proposals/schedule-reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.id }),
    }).catch(() => {});
    fetch("/api/hubspot/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.id, action: "accepted" }),
    }).catch(() => {});
  }

  async function generatePdf() {
    setPdfGenerating(true);
    try {
      const res = await fetch("/api/proposals/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("PDF generation failed — please try again.");
      } else {
        const url: string = json.url ?? null;
        if (url) {
          setPdfUrl(url);
          toast.success("PDF ready!");
        } else {
          toast.success("PDF is generating — refresh in a moment.");
        }
      }
    } catch {
      toast.error("PDF generation failed.");
    }
    setPdfGenerating(false);
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
            <div className="flex items-center gap-2">
              {/* PDF button — always visible for admins */}
              {pdfUrl ? (
                <a href={pdfUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                  style={{ background: "rgba(1,1,1,0.06)", color: "var(--foreground)", fontFamily: "var(--font-body)", border: "1px solid rgba(1,1,1,0.08)" }}>
                  <FileDown size={11} />
                  Download PDF
                </a>
              ) : (
                <button onClick={generatePdf} disabled={pdfGenerating}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                  style={{ background: "rgba(1,1,1,0.06)", color: "var(--foreground)", fontFamily: "var(--font-body)", border: "1px solid rgba(1,1,1,0.08)", cursor: pdfGenerating ? "not-allowed" : "pointer", opacity: pdfGenerating ? 0.6 : 1 }}>
                  {pdfGenerating ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                  {pdfGenerating ? "Generating…" : "Generate PDF"}
                </button>
              )}
              {adminNav.canEdit && (
                <Link href={`/admin/proposals/${adminNav.proposalId}/edit`}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                  style={{ background: "rgba(1,1,1,0.06)", color: "var(--foreground)", fontFamily: "var(--font-body)", border: "1px solid rgba(1,1,1,0.08)" }}>
                  <Pencil size={11} />
                  Edit proposal
                </Link>
              )}
            </div>
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
                {type === "investment" && <InvestmentSection body={section.body} tiers={section.tiers} />}
                {type === "scope"      && <ScopeSection      body={section.body} scopeItems={(section as any).scopeItems} />}
                {type === "timeline"   && <TimelineSection   body={section.body} timelineSteps={(section as any).timelineSteps} />}
                {type === "nextsteps"  && <NextStepsSection  body={section.body} timelineSteps={(section as any).timelineSteps} />}
                {(type === "overview" || type === "default") && <DefaultSection body={section.body} />}
              </motion.div>
            </div>
          );
        })}

        {/* Accepted block */}
        {proposal.status === "accepted" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-7 w-full"
            style={{ background: "rgba(39,103,73,0.04)", border: "1px solid rgba(39,103,73,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} style={{ color: "#276749" }} />
              <p className="text-sm font-semibold" style={{ color: "#276749", fontFamily: "var(--font-body)" }}>Proposal Accepted</p>
            </div>
            {(proposal as any).client_signature_name && (
              <p className="text-sm font-semibold" style={{ color: "#010101", fontFamily: "var(--font-body)" }}>
                {(proposal as any).client_signature_name}
              </p>
            )}
            {(proposal as any).client_signature_email && (
              <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {(proposal as any).client_signature_email}
              </p>
            )}
            {(proposal as any).signed_at && (
              <p className="text-xs mt-1 mb-5" style={{ color: "#276749", fontFamily: "var(--font-body)", opacity: 0.8 }}>
                {new Date((proposal as any).signed_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {!adminNav && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#276749", fontFamily: "var(--font-body)" }}>
                  What happens next
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Link href="/schedule"
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold justify-center"
                    style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                    <Phone size={13} />
                    Book your onboarding call
                  </Link>
                  <Link href="/calendar"
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold justify-center"
                    style={{ background: "rgba(156,132,122,0.1)", color: "var(--ll-taupe)", border: "1px solid rgba(156,132,122,0.2)", fontFamily: "var(--font-body)" }}>
                    <CalendarDays size={13} />
                    Book your first shoot
                  </Link>
                </div>
              </>
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

      {/* ── Post-acceptance "What's next" bar ── */}
      <AnimatePresence>
        {proposal.status === "accepted" && !adminNav && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-30 md:left-16"
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(16px)",
              borderTop: "1px solid rgba(39,103,73,0.2)",
              padding: "14px 24px",
              paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
            }}
          >
            <div className="max-w-2xl mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#276749", fontFamily: "var(--font-body)" }}>
                What happens next
              </p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  href="/schedule"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold flex-1 justify-center"
                  style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)", minWidth: 180 }}
                >
                  <Phone size={13} />
                  Book your onboarding call
                </Link>
                <Link
                  href="/calendar"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold flex-1 justify-center"
                  style={{ background: "rgba(156,132,122,0.1)", color: "var(--ll-taupe)", border: "1px solid rgba(156,132,122,0.2)", fontFamily: "var(--font-body)", minWidth: 180 }}
                >
                  <CalendarDays size={13} />
                  Book your first shoot
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky bottom CTA ── */}
      <AnimatePresence>
        {isPending && !adminNav && (
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
                onClick={() => setShowAcceptModal(true)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <CheckCircle2 size={15} />
                Accept Proposal
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Accept confirmation modal ── */}
      <AnimatePresence>
        {showAcceptModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
              onClick={() => setShowAcceptModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-8 md:left-16 overflow-y-auto"
              style={{ background: "#fff", boxShadow: "0 -12px 48px rgba(0,0,0,0.12)", maxWidth: 680, margin: "0 auto", border: "1px solid var(--border)", maxHeight: "90vh" }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "#010101" }}>
                    Which package would you like to go with?
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                    Select your preferred package, then confirm your details below.
                  </p>
                </div>
                <button onClick={() => setShowAcceptModal(false)} className="p-2 rounded-xl shrink-0 ml-4"
                  style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="mb-5" style={{ height: 1, background: "var(--border)" }} />

              {/* Package selection */}
              {investmentTiers.length > 0 && (
                <div className="grid gap-2.5 mb-6" style={{ gridTemplateColumns: `repeat(${Math.min(investmentTiers.length, 3)}, 1fr)` }}>
                  {investmentTiers.map((tier) => {
                    const isSelected = selectedTier === tier.name;
                    return (
                      <button
                        key={tier.name}
                        onClick={() => setSelectedTier(tier.name)}
                        className="flex flex-col items-center text-center px-4 py-5 rounded-2xl transition-all relative"
                        style={{
                          border: isSelected ? "2px solid #9c847a" : "1.5px solid var(--border)",
                          background: isSelected ? "rgba(156,132,122,0.06)" : "var(--secondary)",
                          boxShadow: isSelected ? "0 0 0 3px rgba(156,132,122,0.15)" : "none",
                        }}
                      >
                        {tier.highlighted && (
                          <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                            style={{ background: "#9c847a", color: "#fff", fontFamily: "var(--font-body)" }}>
                            Most popular
                          </span>
                        )}
                        <p className="text-xs font-bold uppercase tracking-widest mb-2"
                          style={{ color: isSelected ? "#9c847a" : "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                          {tier.name}
                        </p>
                        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "#010101", lineHeight: 1.1 }}>
                          ${tier.price.toLocaleString()}
                        </p>
                        {tier.period && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                            /{tier.period}
                          </p>
                        )}
                        {tier.tagline && (
                          <p className="text-[11px] leading-snug mt-2" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                            {tier.tagline}
                          </p>
                        )}
                        {isSelected && (
                          <div className="mt-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "#9c847a" }}>
                            <CheckCircle2 size={12} color="#fff" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Contact details */}
              <div className="space-y-3 mb-6">
                <input
                  value={acceptName}
                  onChange={(e) => setAcceptName(e.target.value)}
                  placeholder="Full name *"
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)", outline: "none" }}
                />
                <input
                  value={acceptEmail}
                  onChange={(e) => setAcceptEmail(e.target.value)}
                  type="email"
                  placeholder="Email address *"
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)", outline: "none" }}
                />
              </div>

              {(() => {
                const canAccept = !accepting && acceptName.trim() && acceptEmail.trim() && (investmentTiers.length === 0 || selectedTier);
                return (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={acceptProposal}
                    disabled={!canAccept}
                    className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: canAccept ? "#010101" : "var(--secondary)",
                      color: canAccept ? "#fff" : "var(--ll-grey)",
                      fontFamily: "var(--font-body)",
                      cursor: canAccept ? "pointer" : "not-allowed",
                    }}
                  >
                    {accepting ? (
                      <><Loader2 size={14} className="animate-spin" /> Confirming…</>
                    ) : (
                      <><CheckCircle2 size={14} /> Confirm &amp; Accept</>
                    )}
                  </motion.button>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
