"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Paths accessible before Lara unlocks onboarding (proposal view + booking only)
const ALLOWED_PRE_UNLOCK = [
  "/proposals",
  "/schedule",
];

// Paths accessible while completing onboarding
const ALLOWED_DURING_ONBOARDING = [
  "/onboarding",
  "/brand-kit",
  "/brand-brief",
  "/assets",
  "/documents",
  "/schedule",
];

export function OnboardingEnforcer({
  onboardingUnlocked,
  onboardingComplete,
}: {
  onboardingUnlocked: boolean;
  onboardingComplete: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!onboardingUnlocked) {
      // Locked until Lara manually unlocks — only allow proposal viewing + scheduling
      if (!ALLOWED_PRE_UNLOCK.some((p) => pathname.startsWith(p))) {
        router.replace("/proposals");
      }
    } else if (!onboardingComplete) {
      // Unlocked but onboarding not done — redirect to onboarding
      if (!ALLOWED_DURING_ONBOARDING.some((p) => pathname.startsWith(p))) {
        router.replace("/onboarding");
      }
    }
  }, [onboardingUnlocked, onboardingComplete, pathname, router]);

  return null;
}
