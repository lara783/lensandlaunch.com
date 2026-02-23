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

export default function CalendarClient({ events }: { events: CalEvent[] }) {
  const calRef = useRef(null);

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
        .fc {
          font-family: var(--font-body);
        }
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
        .fc-day-today {
          background: rgba(156,132,122,0.06) !important;
        }
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
        .fc-event:hover {
          filter: brightness(0.9);
        }
        .fc-scrollgrid {
          border-color: var(--border) !important;
        }
        .fc-scrollgrid td, .fc-scrollgrid th {
          border-color: var(--border) !important;
        }
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
        {/* Event type legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          {[
            { label: "Shoot",    color: "#9c847a" },
            { label: "Edit",     color: "#aba696" },
            { label: "Review",   color: "#c2ba9b" },
            { label: "Publish",  color: "#010101" },
            { label: "Meeting",  color: "#696348" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

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
          dayMaxEvents={3}
          eventDisplay="block"
        />
      </div>
    </div>
  );
}
