"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import type { Deliverable } from "@/lib/supabase/types";

interface Props {
  initialDeliverables: Deliverable[];
  projectId: string | null;
  userId: string;
}

function CheckCircle({ checked, onClick, disabled }: { checked: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.85 }}
      className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
      style={{
        background: checked ? "var(--ll-taupe)" : "transparent",
        border: `2px solid ${checked ? "var(--ll-taupe)" : "var(--ll-neutral)"}`,
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
      }}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            width="12" height="12" viewBox="0 0 12 12" fill="none"
          >
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function TimelineClient({ initialDeliverables, projectId, userId }: Props) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);
  const supabase = createClient();

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`deliverables:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliverables",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setDeliverables((prev) =>
            prev.map((d) =>
              d.id === payload.new.id ? { ...d, ...payload.new } : d
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, supabase]);

  // Confetti when all client approvals done
  const checkAllApproved = useCallback((items: Deliverable[]) => {
    const allClientDone = items.every((d) => d.client_approved);
    if (allClientDone && items.length > 0) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#9c847a", "#ede8e4", "#010101", "#c2ba9b"],
      });
    }
  }, []);

  async function toggleClientApproval(deliverable: Deliverable) {
    const newValue = !deliverable.client_approved;
    const updated = deliverables.map((d) =>
      d.id === deliverable.id ? { ...d, client_approved: newValue } : d
    );
    setDeliverables(updated);

    await supabase
      .from("deliverables")
      .update({ client_approved: newValue })
      .eq("id", deliverable.id);

    if (newValue) checkAllApproved(updated);
  }

  if (!projectId || deliverables.length === 0) {
    return (
      <div
        className="rounded-2xl p-12 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          No deliverables yet for this project.
        </p>
      </div>
    );
  }

  const clientDone = deliverables.filter((d) => d.client_approved).length;
  const agencyDone = deliverables.filter((d) => d.agency_approved).length;

  return (
    <div>
      {/* Summary chips */}
      <div className="flex gap-3 mb-6">
        <span
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: "rgba(156,132,122,0.12)",
            color: "var(--ll-taupe)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
          }}
        >
          L&amp;L: {agencyDone}/{deliverables.length} done
        </span>
        <span
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: clientDone === deliverables.length ? "rgba(72,187,120,0.12)" : "rgba(217,217,217,0.3)",
            color: clientDone === deliverables.length ? "#276749" : "var(--ll-grey)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
          }}
        >
          You: {clientDone}/{deliverables.length} approved
        </span>
      </div>

      {/* Header row */}
      <div
        className="grid gap-4 px-5 pb-3 text-xs font-semibold uppercase tracking-wider"
        style={{
          gridTemplateColumns: "1fr 120px 120px",
          color: "var(--ll-grey)",
          fontFamily: "var(--font-body)",
        }}
      >
        <span>Deliverable</span>
        <span className="text-center">Lens &amp; Launch</span>
        <span className="text-center">You</span>
      </div>
      <div className="ll-rule mb-2" />

      {/* Rows */}
      <div className="space-y-2">
        {deliverables.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="grid gap-4 items-center px-5 py-4 rounded-xl"
            style={{
              gridTemplateColumns: "1fr 120px 120px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-body)",
            }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {d.title}
              </p>
              {d.description && (
                <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)" }}>
                  {d.description}
                </p>
              )}
              {d.due_date && (
                <p className="text-xs mt-1" style={{ color: "var(--ll-taupe)" }}>
                  Due {new Date(d.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>

            {/* Agency check — read-only for clients */}
            <div className="flex justify-center">
              <CheckCircle checked={d.agency_approved} onClick={() => {}} disabled />
            </div>

            {/* Client check — interactive */}
            <div className="flex justify-center">
              <CheckCircle
                checked={d.client_approved}
                onClick={() => toggleClientApproval(d)}
                disabled={!d.agency_approved}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-5 text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
        You can approve a deliverable once Lens &amp; Launch has marked it complete.
      </p>
    </div>
  );
}
