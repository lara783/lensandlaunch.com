"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  extendedProps?: Record<string, unknown>;
}

const LEGEND = [
  { label: "Shoot",           color: "#9c847a" },
  { label: "Edit",            color: "#aba696" },
  { label: "Review",          color: "#c2ba9b" },
  { label: "Publish",         color: "#010101" },
  { label: "Meeting",         color: "#696348" },
  { label: "Google Calendar", color: "#4285F4" },
];

export default function AdminCalendarClient({
  events,
  hasGoogleCalendar,
}: {
  events: CalEvent[];
  hasGoogleCalendar: boolean;
}) {
  const calRef = useRef(null);
  const legend = hasGoogleCalendar ? LEGEND : LEGEND.slice(0, 5);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}
    >
      <style>{`
        .fc { font-family: var(--font-body); }
        .fc-toolbar-title {
          font-family: var(--font-display) !important;
          font-size: 1.25rem !important;
          color: var(--foreground) !important;
          font-style: italic;
        }
        .fc-button {
          background: var(--secondary) !important;
          border: 1px solid var(--border) !important;
          color: var(--foreground) !important;
          font-family: var(--font-body) !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.04em !important;
          text-transform: uppercase !important;
          padding: 0.4rem 0.8rem !important;
          border-radius: 8px !important;
          box-shadow: none !important;
        }
        .fc-button:hover {
          background: var(--accent) !important;
          color: white !important;
          border-color: var(--accent) !important;
        }
        .fc-button-active {
          background: var(--foreground) !important;
          color: var(--background) !important;
          border-color: var(--foreground) !important;
        }
        .fc-col-header-cell-cushion {
          color: var(--muted-foreground) !important;
          font-size: 0.7rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
          font-weight: 600 !important;
        }
        .fc-daygrid-day-number {
          color: var(--foreground) !important;
          font-size: 0.8rem !important;
        }
        .fc-day-today { background: rgba(156,132,122,0.06) !important; }
        .fc-day-today .fc-daygrid-day-number {
          color: var(--ll-taupe) !important;
          font-weight: 700 !important;
        }
        .fc-event {
          border-radius: 6px !important;
          border: none !important;
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          padding: 2px 6px !important;
          cursor: pointer;
        }
        .fc-event:hover { filter: brightness(0.9); }
        .fc-scrollgrid { border-color: var(--border) !important; }
        .fc-scrollgrid td, .fc-scrollgrid th { border-color: var(--border) !important; }
        .fc-theme-standard .fc-popover {
          background: var(--card) !important;
          border-color: var(--border) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
        }
        .fc-popover-title {
          color: var(--foreground) !important;
          font-family: var(--font-body) !important;
        }
      `}</style>

      <div className="p-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Google Calendar notice if not configured */}
        {!hasGoogleCalendar && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-xs"
            style={{
              background: "rgba(66,133,244,0.08)",
              border: "1px solid rgba(66,133,244,0.2)",
              color: "var(--ll-grey)",
              fontFamily: "var(--font-body)",
            }}
          >
            <span style={{ color: "#4285F4", fontWeight: 600 }}>Google Calendar not connected.</span>{" "}
            Add <code style={{ background: "var(--secondary)", padding: "1px 4px", borderRadius: 4 }}>GOOGLE_CALENDAR_ICS_URL</code> to your <code style={{ background: "var(--secondary)", padding: "1px 4px", borderRadius: 4 }}>.env.local</code> to see your personal events here.
          </div>
        )}

        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={events}
          height="auto"
          dayMaxEvents={4}
          eventDisplay="block"
          eventClick={(info) => {
            if (info.event.extendedProps?.type === "google" && info.event.extendedProps?.htmlLink) {
              window.open(info.event.extendedProps.htmlLink as string, "_blank");
            }
          }}
        />
      </div>
    </div>
  );
}
