"use client";

import { motion } from "framer-motion";
import type { Deliverable } from "@/lib/supabase/types";

interface Props {
  deliverable: Deliverable;
  index: number;
}

export default function DashboardClient({ deliverable: d, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center justify-between py-3 px-4 rounded-xl"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        fontFamily: "var(--font-body)",
      }}
    >
      <span className="text-sm" style={{ color: "var(--foreground)" }}>
        {d.title}
      </span>
      <div className="flex items-center gap-4 text-xs">
        <span
          className="flex items-center gap-1.5"
          style={{ color: d.agency_approved ? "var(--ll-taupe)" : "var(--ll-grey)" }}
        >
          <span
            className="w-4 h-4 rounded-full border flex items-center justify-center text-white"
            style={{
              background: d.agency_approved ? "var(--ll-taupe)" : "transparent",
              borderColor: d.agency_approved ? "var(--ll-taupe)" : "var(--ll-neutral)",
              fontSize: 9,
            }}
          >
            {d.agency_approved ? "✓" : ""}
          </span>
          L&amp;L
        </span>
        <span
          className="flex items-center gap-1.5"
          style={{ color: d.client_approved ? "var(--ll-taupe)" : "var(--ll-grey)" }}
        >
          <span
            className="w-4 h-4 rounded-full border flex items-center justify-center text-white"
            style={{
              background: d.client_approved ? "var(--ll-taupe)" : "transparent",
              borderColor: d.client_approved ? "var(--ll-taupe)" : "var(--ll-neutral)",
              fontSize: 9,
            }}
          >
            {d.client_approved ? "✓" : ""}
          </span>
          You
        </span>
      </div>
    </motion.div>
  );
}
