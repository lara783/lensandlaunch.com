"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  Calendar,
  CalendarCheck,
  FolderOpen,
  LogOut,
  ChevronRight,
  Users,
  FilePlus,
  Palette,
  Compass,
  ListChecks,
  FileText,
  Settings,
  BarChart2,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const clientNav: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",  icon: <LayoutDashboard size={18} /> },
  { label: "Proposals",   href: "/proposals",  icon: <FileText size={18} /> },
  { label: "Invoices",    href: "/invoices",   icon: <Receipt size={18} /> },
  { label: "Deliverables", href: "/deliverables", icon: <CheckSquare size={18} /> },
  { label: "Calendar",    href: "/calendar",   icon: <Calendar size={18} /> },
  { label: "Documents",   href: "/documents",  icon: <FolderOpen size={18} /> },
  { label: "Brand Kit",   href: "/brand-kit",    icon: <Palette size={18} /> },
  { label: "Brand Brief", href: "/brand-brief", icon: <ClipboardList size={18} /> },
  { label: "Team",        href: "/team",        icon: <Users size={18} /> },
  { label: "Onboarding",  href: "/onboarding", icon: <Compass size={18} /> },
  { label: "Book a Call", href: "/schedule",   icon: <CalendarCheck size={18} /> },
  { label: "Settings",    href: "/settings",   icon: <Settings size={18} /> },
];

const adminNav: NavItem[] = [
  { label: "Overview",   href: "/admin",              icon: <LayoutDashboard size={18} /> },
  { label: "Clients",    href: "/admin/clients",      icon: <Users size={18} /> },
  { label: "Proposals",  href: "/admin/proposals/new",icon: <FilePlus size={18} /> },
  { label: "Services",   href: "/admin/services",     icon: <ListChecks size={18} /> },
  { label: "Calendar",   href: "/admin/calendar",     icon: <Calendar size={18} /> },
  { label: "Team",       href: "/admin/team",         icon: <Users size={18} /> },
  { label: "Settings",  href: "/admin/settings",     icon: <Settings size={18} /> },
];

const teamNav: NavItem[] = [
  { label: "Dashboard", href: "/workspace",          icon: <LayoutDashboard size={18} /> },
  { label: "Projects",  href: "/workspace/projects", icon: <FolderOpen size={18} /> },
  { label: "Clients",   href: "/workspace/clients",  icon: <Users size={18} /> },
  { label: "Calendar",  href: "/workspace/calendar", icon: <Calendar size={18} /> },
  { label: "Settings",  href: "/workspace/settings", icon: <Settings size={18} /> },
];

interface SidebarProps {
  role: "client" | "admin" | "team";
  userName: string;
  analyticsEnabled?: boolean;
  onboardingComplete?: boolean;
  onboardingUnlocked?: boolean;
}

export function Sidebar({ role, userName, analyticsEnabled, onboardingComplete, onboardingUnlocked = true }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const baseClientNav = (() => {
    // Locked until Lara manually unlocks onboarding — only show Proposals + Book a Call
    if (!onboardingUnlocked) {
      return clientNav.filter((item) => item.href === "/proposals" || item.href === "/schedule");
    }
    let nav = [...clientNav];
    if (analyticsEnabled) {
      nav = [...nav.slice(0, 4), { label: "Analytics", href: "/analytics", icon: <BarChart2 size={18} /> }, ...nav.slice(4)];
    }
    if (onboardingComplete) {
      nav = nav.filter((item) => item.href !== "/onboarding");
    }
    return nav;
  })();
  const nav = role === "admin" ? adminNav : role === "team" ? teamNav : baseClientNav;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out.");
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.aside
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ duration: 0.25, ease: [0.25, 0.8, 0.25, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col overflow-hidden"
      style={{
        background: "#010101",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: "rgba(255,255,255,0.1)", fontFamily: "var(--font-body)" }}
        >
          L&L
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="ml-3 text-xs tracking-widest uppercase whitespace-nowrap overflow-hidden"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-body)" }}
            >
              Lens &amp; Launch
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px" }} />

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center h-10 px-2 rounded-lg relative group"
                style={{
                  color: isActive ? "var(--ll-taupe)" : "rgba(255,255,255,0.5)",
                }}
              >
                {/* Tubelight glow background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-tubelight"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: "rgba(156,132,122,0.18)",
                      boxShadow:
                        "0 0 16px rgba(156,132,122,0.4), 0 0 32px rgba(156,132,122,0.12), inset 0 1px 0 rgba(156,132,122,0.25)",
                    }}
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}

                <span
                  className="shrink-0 ml-1 relative z-10"
                  style={{
                    filter: isActive
                      ? "drop-shadow(0 0 5px rgba(156,132,122,0.8))"
                      : "none",
                    transition: "filter 0.2s",
                  }}
                >
                  {item.icon}
                </span>

                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                      className="ml-3 text-sm whitespace-nowrap overflow-hidden relative z-10"
                      style={{ fontFamily: "var(--font-body)", fontWeight: isActive ? 600 : 400 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip when collapsed */}
                {!expanded && (
                  <div
                    className="absolute left-14 px-2 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    style={{
                      background: "#010101",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + logout */}
      <div className="px-2 pb-4 space-y-1">
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 8 }} />

        {/* User info */}
        <div className="flex items-center h-10 px-2 rounded-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--ll-taupe)", color: "white", fontFamily: "var(--font-body)" }}
          >
            {initials}
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="ml-3 text-xs whitespace-nowrap overflow-hidden"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {userName}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center h-10 w-full px-2 rounded-lg transition-colors group"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <LogOut size={16} className="shrink-0 ml-1 group-hover:text-red-400 transition-colors" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="ml-3 text-sm whitespace-nowrap overflow-hidden group-hover:text-red-400 transition-colors"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Expand hint */}
      <motion.div
        className="absolute right-0 top-1/2 -translate-y-1/2"
        animate={{ opacity: expanded ? 0 : 0.3 }}
      >
        <ChevronRight size={12} color="white" />
      </motion.div>
    </motion.aside>
  );
}
