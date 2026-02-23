"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className="h-16 flex items-center justify-between px-8 shrink-0"
      style={{
        borderBottom: "1px solid var(--ll-neutral)",
        background: "var(--background)",
      }}
    >
      <div>
        <h1
          className="text-lg leading-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: "var(--secondary)",
          color: "var(--ll-grey)",
          border: "1px solid var(--border)",
        }}
        title="Toggle dark mode"
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </motion.button>
    </header>
  );
}
