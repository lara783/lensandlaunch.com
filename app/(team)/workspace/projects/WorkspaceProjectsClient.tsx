"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  MapPin,
  Clock,
  Lock,
  Link2,
  FileText,
  CalendarDays,
  ClipboardList,
  StickyNote,
  Tag,
} from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: "rgba(39,103,73,0.08)",   color: "#276749" },
  paused:    { bg: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)" },
  completed: { bg: "rgba(1,1,1,0.06)",       color: "#010101" },
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  shoot:   "#9c847a",
  edit:    "#aba696",
  publish: "#010101",
  meeting: "#696348",
  review:  "#c2ba9b",
};

interface ProjectData {
  id: string;
  name: string;
  status: string;
  service_type: string;
  description: string | null;
  start_date: string | null;
  client_id: string;
  shoot_location: string | null;
  call_time: string | null;
  access_notes: string | null;
  mood_board_url: string | null;
  internal_brief: string | null;
}

interface Assignment {
  id: string;
  project_id: string;
  role_on_project: string | null;
  team_notes: string | null;
  projects: ProjectData | null;
}

interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  agency_approved: boolean;
  client_approved: boolean;
  category: string | null;
}

interface CalEvent {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  type: string;
  notes: string | null;
  color: string | null;
}

interface ScopeSection {
  heading: string;
  body: string;
}

interface Props {
  assignments: Assignment[];
  deliverables: Deliverable[];
  events: CalEvent[];
  scopeByProject: Record<string, { proposalTitle: string; sections: ScopeSection[] }>;
  clientMap: Record<string, { full_name: string; business_name: string | null }>;
}

function SectionBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "var(--ll-taupe)" }}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 mb-2">
      <span className="mt-0.5 shrink-0" style={{ color: "var(--ll-taupe)" }}>{icon}</span>
      <div className="min-w-0">
        <span className="text-xs font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{label}: </span>
        <span className="text-xs" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{value}</span>
      </div>
    </div>
  );
}

export default function WorkspaceProjectsClient({ assignments, deliverables, events, scopeByProject, clientMap }: Props) {
  const [expanded, setExpanded] = useState<string | null>(
    assignments.find((a) => a.projects?.status === "active")?.id ?? assignments[0]?.id ?? null
  );

  if (assignments.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          No projects assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((a, i) => {
        const p = a.projects;
        if (!p) return null;

        const isOpen = expanded === a.id;
        const statusStyle = STATUS_COLORS[p.status] ?? STATUS_COLORS.active;
        const projectDeliverables = deliverables.filter((d) => d.project_id === p.id);
        const projectEvents = events.filter((e) => e.project_id === p.id);
        const scope = scopeByProject[p.id];
        const client = clientMap[p.client_id];

        const hasBrief = p.shoot_location || p.call_time || p.access_notes || p.mood_board_url || p.internal_brief;

        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Header — always visible */}
            <button
              className="w-full text-left p-5 flex items-start justify-between gap-4"
              onClick={() => setExpanded(isOpen ? null : a.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                    {p.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold" style={{ background: statusStyle.bg, color: statusStyle.color, fontFamily: "var(--font-body)" }}>
                    {p.status}
                  </span>
                  {a.role_on_project && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      {a.role_on_project}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 capitalize" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                  {p.service_type.replace(/_/g, " ")}
                  {client && ` · ${client.business_name ?? client.full_name}`}
                  {p.start_date && ` · From ${new Date(p.start_date).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`}
                </p>
              </div>
              <span style={{ color: "var(--ll-grey)" }}>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            {/* Expanded content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-0">

                    {/* Your instructions */}
                    {a.team_notes && (
                      <SectionBlock icon={<StickyNote size={14} />} label="Your instructions">
                        <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                          {a.team_notes}
                        </p>
                      </SectionBlock>
                    )}

                    {/* Shoot / project brief */}
                    {hasBrief && (
                      <SectionBlock icon={<FileText size={14} />} label="Shoot brief">
                        {p.shoot_location && <InfoRow icon={<MapPin size={12} />} label="Location" value={p.shoot_location} />}
                        {p.call_time && <InfoRow icon={<Clock size={12} />} label="Call time" value={p.call_time} />}
                        {p.access_notes && <InfoRow icon={<Lock size={12} />} label="Access" value={p.access_notes} />}
                        {p.mood_board_url && (
                          <div className="flex items-center gap-2 mb-2">
                            <Link2 size={12} style={{ color: "var(--ll-taupe)" }} className="shrink-0" />
                            <span className="text-xs font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Mood board: </span>
                            <a
                              href={p.mood_board_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs underline underline-offset-2"
                              style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                            >
                              Open link
                            </a>
                          </div>
                        )}
                        {p.internal_brief && (
                          <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(156,132,122,0.07)", border: "1px solid rgba(156,132,122,0.15)" }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>Internal brief</p>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                              {p.internal_brief}
                            </p>
                          </div>
                        )}
                      </SectionBlock>
                    )}

                    {/* Upcoming events */}
                    {projectEvents.length > 0 && (
                      <SectionBlock icon={<CalendarDays size={14} />} label="Upcoming events">
                        <div className="space-y-2">
                          {projectEvents.map((ev) => (
                            <div key={ev.id} className="flex items-start gap-3">
                              <span
                                className="mt-1 shrink-0 w-2 h-2 rounded-full"
                                style={{ background: ev.color ?? EVENT_TYPE_COLORS[ev.type] ?? "var(--ll-taupe)" }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                                  {ev.title}
                                </p>
                                <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                                  {new Date(ev.start_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                                  <span className="mx-1 capitalize">· {ev.type}</span>
                                </p>
                                {ev.notes && (
                                  <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{ev.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SectionBlock>
                    )}

                    {/* Scope of work */}
                    {scope && (
                      <SectionBlock icon={<ClipboardList size={14} />} label="Scope of work">
                        <p className="text-xs mb-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                          From proposal: <em>{scope.proposalTitle}</em>
                        </p>
                        <div className="space-y-3">
                          {scope.sections.map((s, si) => (
                            <div key={si}>
                              <p className="text-xs font-semibold mb-1" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                                {s.heading}
                              </p>
                              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                                {s.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </SectionBlock>
                    )}

                    {/* Deliverables */}
                    {projectDeliverables.length > 0 && (
                      <SectionBlock icon={<CheckCircle2 size={14} />} label="Deliverables">
                        <div className="space-y-2">
                          {projectDeliverables.map((d) => (
                            <div key={d.id} className="flex items-start gap-3">
                              {d.agency_approved
                                ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "var(--ll-taupe)" }} />
                                : <Circle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--ll-grey)" }} />
                              }
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                                    {d.title}
                                  </span>
                                  {d.category && (
                                    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(156,132,122,0.1)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                                      <Tag size={10} />
                                      {d.category}
                                    </span>
                                  )}
                                </div>
                                {d.due_date && (
                                  <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                                    Due {new Date(d.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-1">
                                {d.client_approved && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(39,103,73,0.08)", color: "#276749", fontFamily: "var(--font-body)" }}>
                                    Client ✓
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SectionBlock>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
