"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Invoice } from "@/lib/supabase/types";

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "rgba(156,132,122,0.15)", text: "var(--ll-taupe)",  label: "Pending" },
  paid:     { bg: "rgba(72,187,120,0.12)",  text: "#276749",           label: "Paid" },
  overdue:  { bg: "rgba(229,62,62,0.1)",    text: "#c53030",           label: "Overdue" },
};

export default function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (invoices.length === 0) {
    return (
      <div
        className="rounded-2xl p-12 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          No invoices yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Note */}
      <div
        className="rounded-xl px-4 py-3 text-xs mb-6"
        style={{
          background: "rgba(156,132,122,0.08)",
          border: "1px solid rgba(156,132,122,0.2)",
          color: "var(--ll-grey)",
          fontFamily: "var(--font-body)",
        }}
      >
        To settle an invoice, use the payment link sent to your email — or reply directly to Lara.
      </div>

      {invoices.map((invoice, i) => {
        const s = statusStyles[invoice.status] ?? statusStyles.pending;
        const isOpen = openId === invoice.id;

        return (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            {/* Header row */}
            <button
              onClick={() => setOpenId(isOpen ? null : invoice.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {invoice.invoice_number}
                </span>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                  style={{ background: s.bg, color: s.text }}
                >
                  {s.label}
                </span>
                {invoice.payment_type === "deposit" && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                    Booking Deposit (50%)
                  </span>
                )}
                {invoice.payment_type === "balance" && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(1,1,1,0.06)", color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                    Balance on Delivery (50%)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6">
                <span className="text-sm" style={{ color: "var(--ll-grey)" }}>
                  Due {new Date(invoice.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                  ${invoice.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                </span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} style={{ color: "var(--ll-grey)" }} />
                </motion.div>
              </div>
            </button>

            {/* Line items */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.8, 0.25, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="px-6 pb-5"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    {/* Line items table */}
                    <div className="mt-4">
                      <div
                        className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                      >
                        <span className="col-span-6">Description</span>
                        <span className="col-span-2 text-right">Qty</span>
                        <span className="col-span-2 text-right">Unit</span>
                        <span className="col-span-2 text-right">Total</span>
                      </div>
                      <div className="ll-rule mb-3" />
                      {invoice.line_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-12 text-sm py-2"
                          style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                        >
                          <span className="col-span-6">{item.description}</span>
                          <span className="col-span-2 text-right" style={{ color: "var(--ll-grey)" }}>{item.quantity}</span>
                          <span className="col-span-2 text-right" style={{ color: "var(--ll-grey)" }}>
                            ${item.unit_price.toFixed(2)}
                          </span>
                          <span className="col-span-2 text-right font-semibold">
                            ${item.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="ll-rule mt-3 mb-3" />
                      <div
                        className="flex justify-between text-sm font-bold"
                        style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                      >
                        <span>Total</span>
                        <span>${invoice.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {invoice.notes && (
                      <p className="mt-4 text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        {invoice.notes}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
