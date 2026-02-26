import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { OnboardingEnforcer } from "@/components/layout/OnboardingEnforcer";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, analytics_enabled, onboarding_complete, onboarding_unlocked")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") redirect("/admin");
  if (profile?.role === "team") redirect("/workspace");

  const onboardingComplete = (profile as any)?.onboarding_complete ?? false;
  const onboardingUnlocked = (profile as any)?.onboarding_unlocked ?? false;

  return (
    <PortalLayout
      role="client"
      userName={profile?.full_name ?? user.email ?? "Client"}
      analyticsEnabled={(profile as any)?.analytics_enabled ?? false}
      onboardingComplete={onboardingComplete}
      onboardingUnlocked={onboardingUnlocked}
    >
      <OnboardingEnforcer
        onboardingUnlocked={onboardingUnlocked}
        onboardingComplete={onboardingComplete}
      />
      {children}
    </PortalLayout>
  );
}
