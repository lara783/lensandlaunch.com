"use client";

import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  extendedProps?: Record<string, unknown>;
}

const EVENT_TYPES = ["shoot", "edit", "review", "publish", "meeting"] as const;
const EVENT_COLORS: Record<string, string> = {
  shoot: "#9c847a", edit: "#aba696", review: "#c2ba9b", publish: "#010101", meeting: "#696348",
};

const LEGEND = [
  { label: "Shoot",           color: "#9c847a" },
  { label: "Edit",            color: "#aba696" },
  { label: "Review",          color: "#c2ba9b" },
  { label: "Publish",         color: "#010101" },
  { label: "Meeting",         color: "#696348" },
  { label: "Google Calendar", color: "#4285F4" },
];

const inputStyle: React.CSSProperties = {
  background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 10,
  color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "0.875rem",
  padding: "0.5rem 0.75rem", outline: "none", width: "100%",
};

export default function AdminCalendarClient({
  events: initEvents,
  hasGoogleCalendar,
}: {
  events: CalEvent[];
  hasGoogleCalendar: boolean;
}) {
  const calRef = useRef(null);
  const legend = hasGoogleCalendar ? LEGEND : LEGEND.slice(0, 5);
  const supabase = createClient();

  const [events, setEvents] = useState(initEvents);
  const [editingEvt, setEditingEvt] = useState<CalEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("09:00");
  const [editType, setEditType] = useState("meeting");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit(evt: CalEvent) {
    setEditingEvt(evt);
    setEditTitle(evt.title ?? "");
    const sd = evt.start ?? "";
    setEditDate(sd.split("T")[0]);
    setEditTime(sd.includes("T") ? sd.split("T")[1].slice(0, 5) : "09:00");
    setEditType((evt.extendedProps?.type as string) ?? "meeting");
    setEditNotes((evt.extendedProps?.notes as string) ?? "");
  }

  async function saveEdit() {
    if (!editingEvt || !editTitle.trim() || !editDate) return;
    setSaving(true);
    const updates = {
      title: editTitle.trim(),
      start_date: `${editDate}T${editTime || "09:00"}:00`,
      type: editType,
      notes: editNotes.trim() || null,
      color: EVENT_COLORS[editType] ?? "#9c847a",
    };
    const { error } = await (supabase as any)
      .from("calendar_events")
      .update(updates)
      .eq("id", editingEvt.id);
    setSaving(false);
    if (error) { toast.error("Failed to update."); return; }
    setEvents(events.map((e) =>
      e.id === editingEvt.id
        ? { ...e, title: updates.title, start: updates.start_date, color: updates.color, extendedProps: { ...e.extendedProps, type: updates.type, notes: updates.notes } }
        : e
    ));
    setEditingEvt(null);
    toast.success("Event updated.");
  }

  return (
    <div>
      {/* Edit modal */}
      <AnimatePresence>
        {editingEvt && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-5 mb-5 space-y-3"
            style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                Edit event
              </p>
              <button onClick={() => setEditingEvt(null)} style={{ color: "var(--ll-grey)" }}><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input placeholder="Event title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle} />
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
              <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={inputStyle} />
              <select value={editType} onChange={(e) => setEditType(e.target.value)} style={inputStyle}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="text-sm font-semibold px-4 py-2 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={() => setEditingEvt(null)} className="text-sm px-4 py-2 rounded-xl" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                Cancel
              </button>
            </div>
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
              const type = info.event.extendedProps?.type as string;
              if (type === "google") {
                const link = info.event.extendedProps?.htmlLink as string;
                if (link) window.open(link, "_blank");
                return;
              }
              // Portal events — open edit modal
              openEdit({
                id: info.event.id,
                title: info.event.title,
                start: info.event.startStr,
                color: info.event.backgroundColor,
                extendedProps: info.event.extendedProps,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
