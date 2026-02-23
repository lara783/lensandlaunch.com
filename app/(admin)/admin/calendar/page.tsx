import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import AdminCalendarClient from "./AdminCalendarClient";

/* ── ICS parser ─────────────────────────────────────────────────────── */

function parseICSDate(val: string): string {
  if (val.length === 8) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }
  const d = val.replace(/Z$/, "");
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${d.slice(13, 15)}`;
}

interface ICSEvent {
  UID?: string;
  SUMMARY?: string;
  DTSTART?: string;
  DTEND?: string;
  URL?: string;
}

function parseICS(text: string): ICSEvent[] {
  const unfolded = text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n");
  const events: ICSEvent[] = [];
  let inEvent = false;
  let current: ICSEvent = {};

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { inEvent = true; current = {}; continue; }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (current.SUMMARY && current.DTSTART) events.push(current);
      continue;
    }
    if (!inEvent) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).split(";")[0].toUpperCase() as keyof ICSEvent;
    const value = line.substring(colonIdx + 1);
    if (["SUMMARY", "DTSTART", "DTEND", "UID", "URL"].includes(key)) {
      (current as any)[key] = value;
    }
  }
  return events;
}

type GCalEvent = { id: string; title: string; start: string; end?: string; color: string; extendedProps: { type: string; htmlLink?: string } };

async function fetchGoogleEvents(): Promise<{ events: GCalEvent[]; ok: boolean }> {
  const icsUrl = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (!icsUrl) return { events: [], ok: false };
  try {
    const res = await fetch(icsUrl, { next: { revalidate: 300 } });
    if (res.status === 404) {
      // Calendar not yet made public — silent fallback
      return { events: [], ok: false };
    }
    if (!res.ok) {
      console.warn(`Google Calendar ICS fetch returned ${res.status} — skipping.`);
      return { events: [], ok: false };
    }
    const text = await res.text();
    const events = parseICS(text).map((e) => ({
      id: `gcal-${e.UID ?? Math.random().toString(36).slice(2)}`,
      title: e.SUMMARY!,
      start: parseICSDate(e.DTSTART!),
      end: e.DTEND ? parseICSDate(e.DTEND) : undefined,
      color: "#4285F4",
      extendedProps: { type: "google", htmlLink: e.URL },
    }));
    return { events, ok: true };
  } catch (err) {
    console.warn("Google Calendar ICS unavailable:", (err as Error).message);
    return { events: [], ok: false };
  }
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    shoot: "#9c847a", edit: "#aba696", review: "#c2ba9b", publish: "#010101", meeting: "#696348",
  };
  return map[type] ?? "#9c847a";
}

export default async function AdminCalendarPage() {
  const supabase = await createClient();

  const [{ data: rawEvents }, { data: rawDeliverables }, { events: googleEvents, ok: googleOk }] = await Promise.all([
    (supabase as any).from("calendar_events").select("id, title, start_date, end_date, type, color"),
    (supabase as any).from("deliverables").select("id, title, due_date").not("due_date", "is", null),
    fetchGoogleEvents(),
  ]);

  const calEvents = [
    ...(rawEvents ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      start: e.start_date,
      end: e.end_date ?? undefined,
      color: e.color ?? typeColor(e.type),
      extendedProps: { type: e.type },
    })),
    ...(rawDeliverables ?? []).map((d: any) => ({
      id: `del-${d.id}`,
      title: d.title,
      start: d.due_date,
      color: "#9c847a",
      extendedProps: { type: "deliverable" },
    })),
    ...googleEvents,
  ];

  return (
    <div className="p-6 md:p-8 w-full">
      <TopBar
        title="All Calendars"
        subtitle={`Aggregate view across all active clients${googleOk ? " · Google Calendar synced" : ""}.`}
      />
      <div className="mt-8">
        <AdminCalendarClient
          events={calEvents}
          hasGoogleCalendar={googleOk}
        />
      </div>
    </div>
  );
}
