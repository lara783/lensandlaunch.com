import { TopBar } from "@/components/layout/TopBar";

export default function SchedulePage() {
  const hubspotUrl = process.env.NEXT_PUBLIC_HUBSPOT_MEETING_URL ?? "";

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar title="Book a Session" subtitle="Schedule time with Lara directly." />

      <div className="mt-8">
        {hubspotUrl ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            <iframe
              src={`${hubspotUrl}?embed=true`}
              title="Book a meeting with Lara"
              width="100%"
              height="700"
              style={{ border: "none", display: "block" }}
            />
          </div>
        ) : (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-sm mb-2"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
            >
              Booking calendar coming soon.
            </p>
            <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              In the meantime, email{" "}
              <a
                href="mailto:hello@lensandlaunch.com"
                style={{ color: "var(--ll-taupe)" }}
              >
                hello@lensandlaunch.com
              </a>{" "}
              to schedule a session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
