"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function NewClientButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", business_name: "", password: "" });
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/create-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to create client.");
    } else {
      toast.success(`Client ${form.full_name} created.`);
      setOpen(false);
      setForm({ email: "", full_name: "", business_name: "", password: "" });
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          background: "#010101",
          color: "#ffffff",
          fontFamily: "var(--font-body)",
          letterSpacing: "0.04em",
        }}
      >
        + New Client
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
              className="w-full max-w-md mx-4 rounded-2xl p-8"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: "var(--font-display)", color: "var(--foreground)", fontSize: "1.25rem" }}>
                  New Client
                </h2>
                <button onClick={() => setOpen(false)} style={{ color: "var(--ll-grey)" }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {[
                  { label: "Full name", key: "full_name", type: "text", required: true },
                  { label: "Email", key: "email", type: "email", required: true },
                  { label: "Business name", key: "business_name", type: "text", required: false },
                  { label: "Temporary password", key: "password", type: "password", required: true },
                ].map(({ label, key, type, required }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      required={required}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        background: "var(--secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                        fontFamily: "var(--font-body)",
                      }}
                    />
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "#010101", color: "#ffffff", fontFamily: "var(--font-body)", cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Creating…" : "Create Client"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
