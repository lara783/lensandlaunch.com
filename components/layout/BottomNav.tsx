"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  CalendarCheck,
  FolderOpen,
  Users,
  FilePlus,
  Calendar,
  Palette,
  FileText,
  Settings,
} from "lucide-react";

const clientNav = [
  { label: "Home",      href: "/dashboard",   icon: <LayoutDashboard size={20} /> },
  { label: "Deliverables", href: "/deliverables", icon: <CheckSquare size={20} /> },
  { label: "Team",      href: "/team",        icon: <Users size={20} /> },
  { label: "Book",      href: "/schedule",    icon: <CalendarCheck size={20} /> },
  { label: "Settings",  href: "/settings",    icon: <Settings size={20} /> },
];

const adminNav = [
  { label: "Overview",  href: "/admin",               icon: <LayoutDashboard size={20} /> },
  { label: "Clients",   href: "/admin/clients",       icon: <Users size={20} /> },
  { label: "Calendar",  href: "/admin/calendar",      icon: <Calendar size={20} /> },
  { label: "Settings",  href: "/admin/settings",      icon: <Settings size={20} /> },
];

const teamNav = [
  { label: "Home",     href: "/workspace",            icon: <LayoutDashboard size={20} /> },
  { label: "Projects", href: "/workspace/projects",   icon: <FolderOpen size={20} /> },
  { label: "Clients",  href: "/workspace/clients",    icon: <Users size={20} /> },
  { label: "Settings", href: "/workspace/settings",   icon: <Settings size={20} /> },
];

const preAcceptanceNav = [
  { label: "Proposal", href: "/proposals", icon: <FileText size={20} /> },
  { label: "Book",     href: "/schedule",  icon: <CalendarCheck size={20} /> },
];

export function BottomNav({ role, onboardingUnlocked = true }: { role: "client" | "admin" | "team"; onboardingUnlocked?: boolean }) {
  const pathname = usePathname();
  const nav = role === "admin" ? adminNav : role === "team" ? teamNav : (!onboardingUnlocked ? preAcceptanceNav : clientNav);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden"
      style={{
        background: "#010101",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {nav.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href + "/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative"
          >
            {/* Tubelight glow pill */}
            {isActive && (
              <motion.div
                layoutId="tubelight-pill"
                className="absolute inset-x-1.5 top-1 bottom-1 rounded-xl"
                style={{
                  background: "rgba(156,132,122,0.18)",
                  boxShadow:
                    "0 0 14px rgba(156,132,122,0.55), 0 0 28px rgba(156,132,122,0.2), inset 0 1px 0 rgba(156,132,122,0.3)",
                }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
              />
            )}

            <span
              className="relative z-10"
              style={{
                color: isActive ? "var(--ll-taupe)" : "rgba(255,255,255,0.38)",
                filter: isActive
                  ? "drop-shadow(0 0 6px rgba(156,132,122,0.7))"
                  : "none",
                transition: "color 0.2s, filter 0.2s",
              }}
            >
              {item.icon}
            </span>
            <span
              className="text-[9px] tracking-wide relative z-10"
              style={{
                fontFamily: "var(--font-body)",
                color: isActive ? "var(--ll-taupe)" : "rgba(255,255,255,0.38)",
                transition: "color 0.2s",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
