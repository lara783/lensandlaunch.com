"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Calendar, FolderOpen, Clock } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  shoot: "#9c847a",
  edit: "#aba696",
  review: "#c2ba9b",
  publish: "#010101",
  meeting: "#696348",
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string | null;
  avatar_url: string | null;
}

interface Assignment {
  id: string;
  project_id: string;
  role_on_project: string | null;
  projects: {
    id: string;
    name: string;
    status: string;
    service_type: string;
    client_id: string;
  } | null;
}

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  agency_approved: boolean;
  client_approved: boolean;
  project_id: string;
  category: string | null;
}

interface CalEvent {
  id: string;
  title: string;
  start_date: string;
  type: string;
  notes: string | null;
  project_id: string;
}

interface Props {
  teamMember: TeamMember;
  assignments: Assignment[];
  pendingDeliverables: Deliverable[];
  upcomingEvents: CalEvent[];
}

export default function WorkspaceDashboard({ teamMember, assignments, pendingDeliverables, upcomingEvents }: Props) {
  const activeProjects = assignments.filter((a) => a.projects?.status === "active");

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="p-5 rounded-2xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Active Projects
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: "var(--foreground)", lineHeight: 1 }}>
            {activeProjects.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
            {teamMember.role}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="p-5 rounded-2xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Pending Tasks
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: "var(--foreground)", lineHeight: 1 }}>
            {pendingDeliverables.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
            awaiting approval
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="p-5 rounded-2xl col-span-2 md:col-span-1"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Upcoming Events
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: "var(--foreground)", lineHeight: 1 }}>
            {upcomingEvents.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
            next 14 days
          </p>
        </motion.div>
      </div>

      {/* Pending deliverables */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} style={{ color: "var(--ll-taupe)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)", fontStyle: "italic" }}>
            Tasks to complete
          </h2>
        </div>
        {pendingDeliverables.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              All caught up — no pending tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingDeliverables.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Circle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--ll-grey)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                    {d.title}
                  </p>
                  {d.description && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      {d.description}
                    </p>
                  )}
                  {d.due_date && (
                    <p className="text-xs mt-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      Due {new Date(d.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
                {d.category && (
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                    {d.category.replace("_", " ")}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Upcoming events */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} style={{ color: "var(--ll-taupe)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)", fontStyle: "italic" }}>
            Coming up
          </h2>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              No events in the next two weeks.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((evt, i) => {
              const d = new Date(evt.start_date);
              const color = EVENT_COLORS[evt.type] ?? "#9c847a";
              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 + i * 0.04 }}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                      {evt.title}
                    </p>
                    {evt.notes && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        {evt.notes}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                      {d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs capitalize mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      {evt.type}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Active projects */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen size={16} style={{ color: "var(--ll-taupe)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)", fontStyle: "italic" }}>
            Your projects
          </h2>
        </div>
        {activeProjects.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              No active projects assigned yet.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activeProjects.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 + i * 0.06 }}
                className="p-5 rounded-2xl"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  {a.projects?.name}
                </p>
                <p className="text-xs mt-1 capitalize" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {a.projects?.service_type?.replace("_", " ")}
                </p>
                {a.role_on_project && (
                  <span className="inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                    {a.role_on_project}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
