"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Invoice, Deliverable } from "@/lib/supabase/types";

interface StatsCardsProps {
  invoices: Invoice[];
  deliverables: Deliverable[];
  projectName: string;
}

function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = to / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= to) {
        setCount(to);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [to]);

  return (
    <span>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (percent / 100) * circumference);
    }, 300);
    return () => clearTimeout(timer);
  }, [percent, circumference]);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" className="absolute -rotate-90">
        {/* Track */}
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke="var(--ll-neutral)"
          strokeWidth="5"
        />
        {/* Progress */}
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke="var(--ll-taupe)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.25, 0.8, 0.25, 1)" }}
        />
      </svg>
      <span
        className="text-xl font-bold z-10"
        style={{ fontFamily: "var(--font-body)", color: "var(--foreground)" }}
      >
        {percent}%
      </span>
    </div>
  );
}

export function StatsCards({ invoices, deliverables, projectName }: StatsCardsProps) {
  const totalDone = deliverables.filter((d) => d.agency_approved && d.client_approved).length;
  const completion = deliverables.length > 0 ? Math.round((totalDone / deliverables.length) * 100) : 0;

  const pendingInvoice = invoices.find((i) => i.status === "pending" || i.status === "overdue");
  const nextDeliverable = deliverables.find((d) => !d.client_approved && d.agency_approved);

  const cardBase: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "1.5rem",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div className="flex gap-4 flex-wrap">
      {/* Project completion */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={cardBase}
        className="flex flex-col items-center justify-center gap-2 text-center"
      >
        <ProgressRing percent={completion} />
        <p className="text-xs mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          {projectName}
        </p>
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
        >
          Project progress
        </p>
      </motion.div>

      {/* Pending invoice */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={cardBase}
        className="flex flex-col justify-between"
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
        >
          Invoice due
        </p>
        {pendingInvoice ? (
          <>
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: "var(--font-body)", color: "var(--foreground)" }}
            >
              <CountUp to={pendingInvoice.amount} prefix="$" />
            </p>
            <div className="mt-3">
              <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {pendingInvoice.invoice_number}
              </p>
              <p className="text-xs mt-0.5" style={{ color: pendingInvoice.status === "overdue" ? "#e53e3e" : "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                Due {new Date(pendingInvoice.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            No outstanding invoices
          </p>
        )}
      </motion.div>

      {/* Next deliverable */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={cardBase}
        className="flex flex-col justify-between"
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
        >
          Awaiting your approval
        </p>
        {nextDeliverable ? (
          <>
            <p
              className="text-xl font-semibold leading-snug"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              {nextDeliverable.title}
            </p>
            {nextDeliverable.due_date && (
              <p className="text-xs mt-2" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                Due {new Date(nextDeliverable.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
            )}
            <a
              href="/timeline"
              className="inline-block mt-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
            >
              Review →
            </a>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            All deliverables approved — great work!
          </p>
        )}
      </motion.div>
    </div>
  );
}
