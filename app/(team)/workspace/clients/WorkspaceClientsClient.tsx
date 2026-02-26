"use client";

import { motion } from "framer-motion";
import { Mail, FolderOpen } from "lucide-react";

interface ClientProfile {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  service_type: string;
}

interface Props {
  clients: ClientProfile[];
  projectsByClient: Record<string, Project[]>;
}

export default function WorkspaceClientsClient({ clients, projectsByClient }: Props) {
  if (clients.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          No clients assigned to you yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map((client, i) => {
        const projects = projectsByClient[client.id] ?? [];
        const activeProjects = projects.filter((p) => p.status === "active");

        return (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="p-5 rounded-2xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  {client.full_name}
                </p>
                {client.business_name && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                    {client.business_name}
                  </p>
                )}
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex items-center gap-1.5 text-xs mt-2 hover:opacity-70 transition-opacity"
                  style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                >
                  <Mail size={11} />
                  {client.email}
                </a>
              </div>
              <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                {activeProjects.length} active
              </span>
            </div>

            {projects.length > 0 && (
              <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <FolderOpen size={11} style={{ color: "var(--ll-grey)" }} />
                    <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      {p.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                      {p.service_type.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
