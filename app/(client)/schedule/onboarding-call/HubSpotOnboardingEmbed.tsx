"use client";

import { useEffect } from "react";

// Allow env var override, but default to the confirmed onboarding call URL.
const MEETING_URL =
  process.env.NEXT_PUBLIC_HUBSPOT_ONBOARDING_MEETING_URL ||
  "https://meetings-ap1.hubspot.com/lara-lawson/onboarding-call";

export default function HubSpotOnboardingEmbed() {
  useEffect(() => {
    // If the HubSpot embed script is already on the page (e.g. navigated here),
    // remove the old one so it re-initialises and finds this component's div.
    const existing = document.querySelector(
      'script[src*="MeetingsEmbedCode"]'
    );
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.src =
      "https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js";
    script.type = "text/javascript";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up on unmount so re-mounting re-runs the initialisation
      const s = document.querySelector('script[src*="MeetingsEmbedCode"]');
      if (s) s.remove();
    };
  }, []);

  return (
    <div
      className="meetings-iframe-container"
      data-src={`${MEETING_URL}?embed=true`}
      style={{ minHeight: 700, width: "100%" }}
    />
  );
}
