"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Circle, Palette, ImageIcon, FileText, CalendarCheck, BookOpen } from "lucide-react";

interface CompletionState {
  hasBrandColors: boolean;
  hasBrandFonts: boolean;
  hasLogo: boolean;
  hasAssets: boolean;
  hasProposal: boolean;
}

interface Step {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean;
  cta: string;
  href: string;
}

export default function OnboardingClient({
  firstName,
  completionState,
}: {
  firstName: string;
  completionState: CompletionState;
}) {
  const steps: Step[] = [
    {
      id: "logo",
      icon: <ImageIcon size={20} />,
      title: "Upload your logo",
      description:
        "Add your primary logo in PNG or SVG format. Hi-res files preferred — these will be used across your content.",
      done: completionState.hasLogo,
      cta: "Upload logo →",
      href: "/brand-kit",
    },
    {
      id: "colors",
      icon: <Palette size={20} />,
      title: "Set your brand colours",
      description:
        "Enter your brand colour HEX codes so Lens & Launch can match your visual identity perfectly.",
      done: completionState.hasBrandColors,
      cta: "Set colours →",
      href: "/brand-kit",
    },
    {
      id: "fonts",
      icon: <BookOpen size={20} />,
      title: "Choose your brand fonts",
      description:
        "Select the fonts that represent your brand. If you use a custom typeface, upload the font file.",
      done: completionState.hasBrandFonts,
      cta: "Add fonts →",
      href: "/brand-kit",
    },
    {
      id: "assets",
      icon: <FileText size={20} />,
      title: "Upload brand assets",
      description:
        "Share any additional files — brand guides, secondary logos, icon marks, style references, or hi-res imagery.",
      done: completionState.hasAssets,
      cta: "Upload assets →",
      href: "/brand-kit",
    },
    {
      id: "proposal",
      icon: <FileText size={20} />,
      title: "Review your proposal",
      description:
        "Your Lens & Launch proposal outlines the scope, timeline, and deliverables for your project. Take a look and accept when ready.",
      done: completionState.hasProposal,
      cta: "View proposals →",
      href: "/dashboard",
    },
    {
      id: "call",
      icon: <CalendarCheck size={20} />,
      title: "Book your onboarding call",
      description:
        "Schedule a 30-minute call with Lara to walk through your project, timeline, and any questions you have.",
      done: false,
      cta: "Book a call →",
      href: "/schedule",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div>
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2
          className="text-3xl italic mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
        >
          Welcome, {firstName}.
        </h2>
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          Complete these steps to get your project off to the best start.
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5 mb-8"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Setup progress
          </p>
          <p className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
            {doneCount} / {totalCount}
          </p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--ll-taupe)" }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: [0.25, 0.8, 0.25, 1], delay: 0.3 }}
          />
        </div>
        {doneCount === totalCount && (
          <p className="mt-3 text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
            You&apos;re all set! 🎉
          </p>
        )}
      </motion.div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.06 }}
            className="rounded-2xl p-5"
            style={{
              background: "var(--card)",
              border: `1px solid ${step.done ? "rgba(156,132,122,0.35)" : "var(--border)"}`,
              opacity: step.done ? 0.75 : 1,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Status icon */}
              <div className="shrink-0 mt-0.5" style={{ color: step.done ? "var(--ll-taupe)" : "var(--ll-grey)" }}>
                {step.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span style={{ color: "var(--ll-taupe)" }}>{step.icon}</span>
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "var(--font-body)",
                      textDecoration: step.done ? "line-through" : "none",
                    }}
                  >
                    {step.title}
                  </p>
                  {step.done && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(156,132,122,0.15)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                    >
                      Done
                    </span>
                  )}
                </div>

                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {step.description}
                </p>

                {!step.done && (
                  <Link
                    href={step.href}
                    className="inline-block mt-3 text-xs font-semibold"
                    style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Portal guide */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 rounded-2xl p-6"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
        >
          How your portal works
        </p>
        <div className="space-y-4">
          {[
            { label: "Dashboard", desc: "See your project progress, upcoming deliverables, and outstanding invoices at a glance." },
            { label: "Timeline", desc: "Track each deliverable with dual approval — Lens & Launch marks work done, you approve it." },
            { label: "Documents", desc: "Access invoices, contracts, and files shared by your team in one place." },
            { label: "Brand Kit", desc: "Store your colours, fonts, and logos here so the team always has access to your identity." },
            { label: "Book a Call", desc: "Schedule time with Lara directly through the portal — no back-and-forth emails." },
          ].map((item) => (
            <div key={item.label} className="flex gap-3">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: "var(--ll-taupe)" }}
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  {item.label}
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
