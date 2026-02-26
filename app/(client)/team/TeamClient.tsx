"use client";

import { Mail, Phone } from "lucide-react";
import type { TeamMemberWithRole } from "@/lib/supabase/types";

interface Props {
  team: TeamMemberWithRole[];
  projectName: string | null;
}

export default function TeamClient({ team, projectName }: Props) {
  if (team.length === 0) {
    return (
      <div
        className="rounded-2xl p-12 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          Your team hasn&apos;t been assigned yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {projectName && (
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
          Working on {projectName}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {team.map((member) => (
          <div
            key={member.id}
            className="rounded-2xl p-6 flex flex-col items-center text-center gap-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            {/* Avatar */}
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.name}
                className="w-20 h-20 rounded-full object-cover"
                style={{ border: "3px solid var(--ll-taupe)" }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: "var(--ll-taupe)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                {member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
            )}

            {/* Info */}
            <div>
              <p
                className="text-base font-semibold mb-0.5"
                style={{ color: "var(--foreground)", fontFamily: "var(--font-display)", fontStyle: "italic" }}
              >
                {member.name}
              </p>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                {member.role}
              </p>
              {member.role_on_project && (
                <span
                  className="inline-block text-xs px-2.5 py-0.5 rounded-full mb-2"
                  style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
                >
                  {member.role_on_project}
                </span>
              )}
              {member.bio && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {member.bio}
                </p>
              )}
            </div>

            {/* Contact links */}
            <div className="flex flex-wrap justify-center gap-3 mt-auto">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  style={{
                    background: "var(--secondary)",
                    color: "var(--ll-taupe)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                    textDecoration: "none",
                  }}
                >
                  <Mail size={12} /> {member.email}
                </a>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  style={{
                    background: "var(--secondary)",
                    color: "var(--ll-taupe)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                    textDecoration: "none",
                  }}
                >
                  <Phone size={12} /> {member.phone}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
