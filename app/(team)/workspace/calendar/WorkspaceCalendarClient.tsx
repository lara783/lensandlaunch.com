"use client";

import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  extendedProps?: Record<string, unknown>;
}

const LEGEND = [
  { label: "Shoot",   color: "#9c847a" },
  { label: "Edit",    color: "#aba696" },
  { label: "Review",  color: "#c2ba9b" },
  { label: "Publish", color: "#010101" },
  { label: "Meeting", color: "#696348" },
];

interface EventDetail {
  title: string;
  start: string;
  type: string;
  notes: string;
}

export default function WorkspaceCalendarClient({ events }: { events: CalEvent[] }) {
  const calRef = useRef(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);

  return (
    <div>
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-5 mb-5 space-y-2"
            style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                Event details
              </p>
              <button onClick={() => setDetail(null)} style={{ color: "var(--ll-grey)" }}>
                <X size={14} />
              </button>
            </div>
            <p className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)", fontStyle: "italic" }}>
              {detail.title}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {new Date(detail.start).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                {detail.type}
              </span>
            </div>
            {detail.notes && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                {detail.notes}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
          .fc-button:hover { background: var(--accent) !important; color: white !important; border-color: var(--accent) !important; }
          .fc-button-active { background: var(--foreground) !important; color: var(--background) !important; border-color: var(--foreground) !important; }
          .fc-col-header-cell-cushion { color: var(--muted-foreground) !important; font-size: 0.7rem !important; text-transform: uppercase !important; letter-spacing: 0.08em !important; font-weight: 600 !important; }
          .fc-daygrid-day-number { color: var(--foreground) !important; font-size: 0.8rem !important; }
          .fc-day-today { background: rgba(156,132,122,0.06) !important; }
          .fc-day-today .fc-daygrid-day-number { color: var(--ll-taupe) !important; font-weight: 700 !important; }
          .fc-event { border-radius: 6px !important; border: none !important; font-size: 0.75rem !important; font-weight: 500 !important; padding: 2px 6px !important; cursor: pointer; }
          .fc-event:hover { filter: brightness(0.9); }
          .fc-scrollgrid { border-color: var(--border) !important; }
          .fc-scrollgrid td, .fc-scrollgrid th { border-color: var(--border) !important; }
          .fc-theme-standard .fc-popover { background: var(--card) !important; border-color: var(--border) !important; border-radius: 12px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
          .fc-popover-title { color: var(--foreground) !important; font-family: var(--font-body) !important; }
        `}</style>

        <div className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            {LEGEND.map((item) => (
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
            timeZone="Australia/Brisbane"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek",
            }}
            events={events}
            height="auto"
            dayMaxEvents={4}
            eventDisplay="block"
            eventClick={(info: any) => {
              setDetail({
                title: info.event.title,
                start: info.event.startStr,
                type: (info.event.extendedProps?.type as string) ?? "",
                notes: (info.event.extendedProps?.notes as string) ?? "",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
