"use client";

import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface Props {
  role: "client" | "admin" | "team";
  userName: string;
  analyticsEnabled?: boolean;
  onboardingComplete?: boolean;
  onboardingUnlocked?: boolean;
  children: React.ReactNode;
}

export function PortalLayout({ role, userName, analyticsEnabled, onboardingComplete, onboardingUnlocked, children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar
        role={role}
        userName={userName}
        analyticsEnabled={analyticsEnabled}
        onboardingComplete={onboardingComplete}
        onboardingUnlocked={onboardingUnlocked}
      />
      <main className="flex-1 md:ml-16 overflow-y-auto pb-16 md:pb-0 w-full min-w-0">
        {children}
      </main>
      <BottomNav role={role} onboardingUnlocked={onboardingUnlocked} />
    </div>
  );
}
