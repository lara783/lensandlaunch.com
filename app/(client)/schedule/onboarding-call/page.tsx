import { TopBar } from "@/components/layout/TopBar";
import HubSpotOnboardingEmbed from "./HubSpotOnboardingEmbed";

export default function OnboardingCallPage() {
  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="Book Your Onboarding Call"
        subtitle="Schedule your 30-minute kick-off call with Lara."
      />
      <div className="mt-8 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
        <HubSpotOnboardingEmbed />
      </div>
    </div>
  );
}
