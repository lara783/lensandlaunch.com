"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", color: "#E1306C" },
  { value: "facebook",  label: "Facebook",  color: "#1877F2" },
  { value: "tiktok",    label: "TikTok",    color: "#010101" },
  { value: "all",       label: "All",       color: "#696348" },
];

function fmt(v: number | null) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-AU");
}

function delta(curr: number | null, prv: number | null) {
  if (curr == null || prv == null || prv === 0) return null;
  const pct = ((curr - prv) / Math.abs(prv)) * 100;
  return { pct: Math.abs(pct).toFixed(1), up: pct >= 0 };
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const w = 64, h = 28;
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - v * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </svg>
  );
}

export default function AnalyticsClient({ analytics }: { analytics: any[] }) {
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "tiktok" | "all">("instagram");

  const pl = PLATFORMS.find((p) => p.value === platform)!;

  // ── Per-platform view ─────────────────────────────────────────────────────
  if (platform !== "all") {
    const saved = analytics.filter((a) => a.platform === platform);
    const latest = saved[0];
    const prev = saved[1];

    const reach          = latest?.reach ?? null;
    const impressions    = latest?.impressions ?? null;
    const totalFollowers = latest?.total_followers ?? null;
    const engagementRate = latest?.engagement_rate ?? null;
    const prevReach      = prev?.reach ?? null;
    const prevImpressions = prev?.impressions ?? null;
    const prevFollowers  = prev?.total_followers ?? null;

    const sparkData = (field: string) => {
      const vals = [...saved].reverse().slice(-7).map((r) => Number(r[field]) || 0);
      const max = Math.max(...vals, 1);
      return vals.map((v) => v / max);
    };

    const kpis = [
      { label: "Reach",           val: reach,          pv: prevReach,       disp: fmt(reach),          spark: sparkData("reach"),          color: "#9c847a" },
      { label: "Impressions",     val: impressions,    pv: prevImpressions, disp: fmt(impressions),    spark: sparkData("impressions"),    color: "#aba696" },
      { label: "Followers",       val: totalFollowers, pv: prevFollowers,   disp: fmt(totalFollowers), spark: sparkData("total_followers"), color: "#c2ba9b" },
      { label: "Engagement Rate", val: engagementRate, pv: null,            disp: engagementRate != null ? `${engagementRate}%` : "—", spark: sparkData("engagement_rate"), color: "#696348" },
    ];

    return (
      <div>
        {/* Platform selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PLATFORMS.map((p) => (
            <button key={p.value} onClick={() => setPlatform(p.value as any)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: platform === p.value ? p.color : "var(--secondary)",
                color: platform === p.value ? "#fff" : "var(--ll-grey)",
                border: platform === p.value ? "none" : "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map(({ label, val, pv, disp, spark, color }, ki) => {
            const d = delta(val, pv);
            return (
              <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ki * 0.06 }}
                className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{label}</p>
                <p className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{disp}</p>
                <div className="flex items-center justify-between mt-2">
                  {d ? (
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: d.up ? "#276749" : "#c53030", fontFamily: "var(--font-body)" }}>
                      {d.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {d.pct}% vs last period
                    </span>
                  ) : <span />}
                  <Sparkline data={spark} color={color} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Saved reports list */}
        {saved.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{pl.label} Reports</p>
            </div>
            {saved.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                    {new Date(r.period_start).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – {new Date(r.period_end).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {r.notes && <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{r.notes}</p>}
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Reach</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(r.reach)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Impressions</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(r.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Engagement</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{r.engagement_rate != null ? `${r.engagement_rate}%` : "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-10 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No {pl.label} data yet — your team will add reports here.</p>
          </div>
        )}
      </div>
    );
  }

  // ── All Platforms view ─────────────────────────────────────────────────────
  const subPlatforms = [
    { value: "instagram", label: "Instagram", color: "#E1306C" },
    { value: "facebook",  label: "Facebook",  color: "#1877F2" },
    { value: "tiktok",    label: "TikTok",    color: "#010101" },
  ];

  const sumOrNull = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  };
  const avgOrNull = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v != null);
    return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : null;
  };

  const perPlatform = subPlatforms.map((p) => {
    const saved = analytics.filter((a) => a.platform === p.value);
    const latest = saved[0];
    const prev = saved[1];
    return {
      ...p,
      reach: latest?.reach ?? null,
      impressions: latest?.impressions ?? null,
      followers: latest?.total_followers ?? null,
      engagement: latest?.engagement_rate ?? null,
      prevReach: prev?.reach ?? null,
      prevImpressions: prev?.impressions ?? null,
      prevFollowers: prev?.total_followers ?? null,
    };
  });

  const totalReach = sumOrNull(perPlatform.map((p) => p.reach));
  const totalImpressions = sumOrNull(perPlatform.map((p) => p.impressions));
  const totalFollowers = sumOrNull(perPlatform.map((p) => p.followers));
  const avgEngagement = avgOrNull(perPlatform.map((p) => p.engagement));
  const prevTotalReach = sumOrNull(perPlatform.map((p) => p.prevReach));
  const prevTotalImpressions = sumOrNull(perPlatform.map((p) => p.prevImpressions));
  const prevTotalFollowers = sumOrNull(perPlatform.map((p) => p.prevFollowers));

  const totalsKpis = [
    { label: "Total Reach",       val: totalReach,       pv: prevTotalReach,       disp: fmt(totalReach),       color: "#9c847a" },
    { label: "Total Impressions", val: totalImpressions, pv: prevTotalImpressions, disp: fmt(totalImpressions), color: "#aba696" },
    { label: "Total Followers",   val: totalFollowers,   pv: prevTotalFollowers,   disp: fmt(totalFollowers),   color: "#c2ba9b" },
    { label: "Avg Engagement",    val: avgEngagement,    pv: null,                 disp: avgEngagement != null ? `${avgEngagement}%` : "—", color: "#696348" },
  ];

  return (
    <div>
      {/* Platform selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PLATFORMS.map((p) => (
          <button key={p.value} onClick={() => setPlatform(p.value as any)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: platform === p.value ? p.color : "var(--secondary)",
              color: platform === p.value ? "#fff" : "var(--ll-grey)",
              border: platform === p.value ? "none" : "1px solid var(--border)",
              fontFamily: "var(--font-body)",
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Combined KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {totalsKpis.map(({ label, val, pv, disp, color }, ki) => {
          const d = delta(val, pv);
          return (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ki * 0.06 }}
              className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{label}</p>
              <p className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{disp}</p>
              {d ? (
                <span className="flex items-center gap-1 text-xs font-semibold mt-2" style={{ color: d.up ? "#276749" : "#c53030", fontFamily: "var(--font-body)" }}>
                  {d.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {d.pct}% vs last period
                </span>
              ) : <span className="block mt-2 h-4" />}
            </motion.div>
          );
        })}
      </div>

      {/* Per-platform breakdown */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
        <div className="px-5 py-3" style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Platform Breakdown</p>
        </div>
        {perPlatform.map((p) => (
          <div key={p.value} className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{p.label}</p>
            </div>
            <div className="flex gap-4 sm:gap-6 text-right">
              <div><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Reach</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(p.reach)}</p></div>
              <div><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Impressions</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(p.impressions)}</p></div>
              <div><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Followers</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(p.followers)}</p></div>
              <div className="hidden sm:block"><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Engagement</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{p.engagement != null ? `${p.engagement}%` : "—"}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
