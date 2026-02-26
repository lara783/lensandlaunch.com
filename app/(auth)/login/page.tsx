"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Incorrect email or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #ede8e4 0%, #ffffff 50%, #f5f2ef 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
        className="w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold tracking-wider"
              style={{ background: "#010101", fontFamily: "var(--font-body)" }}
            >
              L&L
            </div>
            <p
              className="text-xs tracking-[0.15em] uppercase"
              style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
            >
              Lens &amp; Launch Media
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(156, 132, 122, 0.15)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "#010101" }}
          >
            Welcome back.
          </h1>
          <p
            className="text-sm mb-8"
            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
          >
            Sign in to your client portal.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email field */}
            <div className="relative">
              <motion.label
                htmlFor="email"
                className="absolute left-3 text-sm pointer-events-none transition-all"
                animate={{
                  top: emailFocused || email ? "6px" : "50%",
                  translateY: emailFocused || email ? "0%" : "-50%",
                  fontSize: emailFocused || email ? "10px" : "14px",
                  color: emailFocused ? "var(--ll-taupe)" : "var(--ll-grey)",
                }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{ fontFamily: "var(--font-body)" }}
              >
                Email
              </motion.label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                required
                className="w-full pt-6 pb-2 px-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "rgba(237, 232, 228, 0.4)",
                  border: `1.5px solid ${emailFocused ? "var(--ll-taupe)" : "rgba(156,132,122,0.2)"}`,
                  fontFamily: "var(--font-body)",
                  color: "#010101",
                }}
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <motion.label
                htmlFor="password"
                className="absolute left-3 text-sm pointer-events-none"
                animate={{
                  top: passwordFocused || password ? "6px" : "50%",
                  translateY: passwordFocused || password ? "0%" : "-50%",
                  fontSize: passwordFocused || password ? "10px" : "14px",
                  color: passwordFocused ? "var(--ll-taupe)" : "var(--ll-grey)",
                }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{ fontFamily: "var(--font-body)" }}
              >
                Password
              </motion.label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                className="w-full pt-6 pb-2 px-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "rgba(237, 232, 228, 0.4)",
                  border: `1.5px solid ${passwordFocused ? "var(--ll-taupe)" : "rgba(156,132,122,0.2)"}`,
                  fontFamily: "var(--font-body)",
                  color: "#010101",
                  paddingRight: "2.75rem",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ll-grey)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide uppercase transition-colors"
              style={{
                background: loading ? "var(--ll-grey)" : "#010101",
                color: "#ffffff",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.06em",
                cursor: loading ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
        >
          Secure client portal — Lens &amp; Launch Media
        </p>
      </motion.div>
    </div>
  );
}
