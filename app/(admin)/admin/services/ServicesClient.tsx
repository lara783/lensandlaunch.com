"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";

export interface Service {
  id: string;
  category: string;
  name: string;
  resource: string | null;
  internal_rate: number | null;
  charge_out_rate: number;
  unit: string;
  active: boolean;
  sort_order: number;
}

export interface CogsItem {
  id: string;
  name: string;
  monthly_cost: number | null;
  annual_cost: number | null;
  day_rate: number | null;
}

const CATEGORY_ORDER = [
  "Strategy & Consulting",
  "Photography",
  "Video Production",
  "Content Strategy",
  "Script Writing & Teleprompter Setup",
  "Media Delivery",
  "Miscellaneous",
];

function fmt(n: number | null, unit?: string): string {
  if (n === null) return "—";
  const s = `$${n.toFixed(2)}`;
  if (unit === "per_hour") return `${s}/hr`;
  if (unit === "fixed") return `${s} fixed`;
  return s;
}

function EditableRate({
  service,
  onSave,
}: {
  service: Service;
  onSave: (id: string, rate: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(service.charge_out_rate.toString());

  function save() {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) { toast.error("Invalid rate."); return; }
    onSave(service.id, n);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>$</span>
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          className="w-20 text-sm text-right rounded-lg px-2 py-1 outline-none"
          style={{ background: "var(--secondary)", border: "1px solid var(--ll-taupe)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}
        />
        <button onClick={save} style={{ color: "var(--ll-taupe)" }}><Check size={14} /></button>
        <button onClick={() => setEditing(false)} style={{ color: "var(--ll-grey)" }}><X size={14} /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 group"
    >
      <span className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
        {fmt(service.charge_out_rate, service.unit)}
      </span>
      <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "var(--ll-taupe)" }} />
    </button>
  );
}

export default function ServicesClient({
  initialServices,
  cogsItems,
  cogsBase,
}: {
  initialServices: Service[];
  cogsItems: CogsItem[];
  cogsBase: number;
}) {
  const [services, setServices] = useState(initialServices);
  const supabase = createClient();

  async function updateRate(id: string, rate: number) {
    setServices(services.map((s) => s.id === id ? { ...s, charge_out_rate: rate } : s));
    const { error } = await (supabase as any).from("services").update({ charge_out_rate: rate }).eq("id", id);
    if (error) toast.error("Save failed.");
    else toast.success("Rate updated.");
  }

  async function toggleActive(id: string) {
    const svc = services.find((s) => s.id === id);
    if (!svc) return;
    setServices(services.map((s) => s.id === id ? { ...s, active: !s.active } : s));
    await (supabase as any).from("services").update({ active: !svc.active }).eq("id", id);
  }

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = services.filter((s) => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, Service[]>);

  const totalAnnualCogs = cogsItems.reduce((sum, c) => sum + (c.annual_cost ?? 0), 0);

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    marginBottom: "1.5rem",
    overflow: "hidden",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--ll-taupe)",
  };

  return (
    <div>
      {/* Services by category */}
      {Object.entries(grouped).map(([category, items], gi) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.05 }}
          style={cardStyle}
        >
          {/* Category header */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}
          >
            <p style={labelStyle}>{category}</p>
            <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              {items.filter((s) => s.active).length} active service{items.filter((s) => s.active).length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Column headers */}
          <div
            className="grid px-5 py-2 text-xs font-semibold"
            style={{
              gridTemplateColumns: "1fr 160px 100px 80px 60px",
              color: "var(--ll-grey)",
              fontFamily: "var(--font-body)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span>Service</span>
            <span>Resource</span>
            <span>Internal rate</span>
            <span>Client rate</span>
            <span>Active</span>
          </div>

          {/* Rows */}
          {items.map((s) => (
            <div
              key={s.id}
              className="grid px-5 py-3 items-center"
              style={{
                gridTemplateColumns: "1fr 160px 100px 80px 60px",
                borderBottom: "1px solid var(--border)",
                opacity: s.active ? 1 : 0.45,
              }}
            >
              <span className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                {s.name}
              </span>
              <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {s.resource ?? "—"}
              </span>
              <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {fmt(s.internal_rate, s.unit)}
              </span>
              <EditableRate service={s} onSave={updateRate} />
              <label className="flex items-center cursor-pointer">
                <div
                  className="w-8 h-4 rounded-full relative transition-colors"
                  style={{ background: s.active ? "var(--ll-taupe)" : "var(--ll-neutral)" }}
                  onClick={() => toggleActive(s.id)}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                    style={{ transform: s.active ? "translateX(18px)" : "translateX(2px)" }}
                  />
                </div>
              </label>
            </div>
          ))}
        </motion.div>
      ))}

      {/* COGS */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={cardStyle}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}
        >
          <p style={labelStyle}>Camera Equipment & Subscriptions (COGS)</p>
          <p className="text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
            Base charge: ${cogsBase}/day
          </p>
        </div>

        <div
          className="grid px-5 py-2 text-xs font-semibold"
          style={{
            gridTemplateColumns: "1fr 120px 120px 100px",
            color: "var(--ll-grey)",
            fontFamily: "var(--font-body)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span>Item</span>
          <span>Monthly cost</span>
          <span>Annual cost</span>
          <span>Day rate</span>
        </div>

        {cogsItems.map((c) => (
          <div
            key={c.id}
            className="grid px-5 py-3 items-center"
            style={{
              gridTemplateColumns: "1fr 120px 120px 100px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{c.name}</span>
            <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              {c.monthly_cost ? `$${c.monthly_cost.toFixed(2)}` : "—"}
            </span>
            <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              {c.annual_cost ? `$${c.annual_cost.toFixed(2)}` : "—"}
            </span>
            <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              {c.day_rate ? `$${c.day_rate.toFixed(2)}/day` : "—"}
            </span>
          </div>
        ))}

        {/* Total */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "var(--secondary)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Total annual COGS
          </p>
          <p className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
            ${totalAnnualCogs.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </motion.div>

      <p className="text-xs mt-2" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
        Click any client rate to edit it inline. Changes save instantly. All rates are used as context when generating proposals with AI.
      </p>
    </div>
  );
}
