"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import Link from "next/link";

function fmt(v: number | null) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-AU");
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  facebook:  "#1877F2",
  tiktok:    "#010101",
};

export default function AdminAnalyticsSummary({
  analytics,
  clients,
}: {
  analytics: any[];
  clients: any[];
}) {
  const [open, setOpen] = useState(false);

  if (!analytics.length) return null;

  // Aggregate totals across latest report per client per platform
  const latestPerClientPlatform = new Map<string, any>();
  for (const row of analytics) {
    const key = `${row.client_id}:${row.platform}`;
    if (!latestPerClientPlatform.has(key)) latestPerClientPlatform.set(key, row);
  }
  const rows = Array.from(latestPerClientPlatform.values());

  const totalReach       = rows.reduce((s, r) => s + (r.reach ?? 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalNewFollowers = rows.reduce((s, r) => s + (r.new_followers ?? 0), 0);
  const engRates         = rows.filter((r) => r.engagement_rate != null).map((r) => r.engagement_rate);
  const avgEngRate       = engRates.length ? (engRates.reduce((s, v) => s + v, 0) / engRates.length).toFixed(2) : null;

  // Per-client breakdown: get client's latest entry across all platforms
  const perClient = clients.map((c) => {
    const clientRows = analytics.filter((a) => a.client_id === c.id);
    const latestByPlatform = ["instagram", "facebook", "tiktok"].map((pl) => {
      const r = clientRows.find((a) => a.platform === pl);
      return { platform: pl, reach: r?.reach ?? null, followers: r?.total_followers ?? null };
    }).filter((r) => r.reach != null || r.followers != null);
    return { ...c, analytics: latestByPlatform };
  }).filter((c) => c.analytics.length > 0);

  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full mb-4"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={14} style={{ color: "var(--ll-taupe)" }} />
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Analytics Overview
          </p>
        </div>
        {open ? <ChevronUp size={14} style={{ color: "var(--ll-grey)" }} /> : <ChevronDown size={14} style={{ color: "var(--ll-grey)" }} />}
      </button>
      <div className="ll-rule mb-4" />

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            {/* Aggregate KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Reach",        value: fmt(totalReach) },
                { label: "Total Impressions",  value: fmt(totalImpressions) },
                { label: "New Followers",      value: fmt(totalNewFollowers) },
                { label: "Avg Engagement",     value: avgEngRate ? `${avgEngRate}%` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Per-client table */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
              <div className="px-5 py-3" style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Per-client latest</p>
              </div>
              {perClient.map((c) => (
                <Link key={c.id} href={`/admin/clients/${c.id}?tab=analytics`}>
                  <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{c.full_name}</p>
                      {c.business_name && <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{c.business_name}</p>}
                    </div>
                    <div className="flex gap-4 items-center">
                      {c.analytics.map((a: any) => (
                        <div key={a.platform} className="text-right">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${PLATFORM_COLORS[a.platform]}18`, color: PLATFORM_COLORS[a.platform], fontFamily: "var(--font-body)" }}>
                            {a.platform.slice(0, 2).toUpperCase()}
                          </span>
                          <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(a.reach)}</p>
                          <p className="text-[10px]" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>reach</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
