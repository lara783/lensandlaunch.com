"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Sparkles, FileText } from "lucide-react";
import type { ProposalSection } from "@/lib/supabase/types";

const DEFAULT_SECTIONS: ProposalSection[] = [
  { heading: "Overview", body: "" },
  { heading: "Scope of Work", body: "" },
  { heading: "Investment", body: "" },
  { heading: "Timeline", body: "" },
  { heading: "Next Steps", body: "" },
];

interface Client {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
}

interface Project { id: string; name: string; status: string; }

interface SavedProposal {
  id: string;
  title: string;
  status: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

interface EditProposal {
  id: string;
  client_id: string;
  project_id?: string | null;
  title: string;
  content: ProposalSection[];
  status: string;
}

interface Props {
  clients: Client[];
  savedProposals: SavedProposal[];
  editProposal?: EditProposal;
  initialProjects?: Project[];
}

export default function ProposalBuilderClient({ clients, savedProposals, editProposal, initialProjects = [] }: Props) {
  const isEditing = !!editProposal;
  const initSections = editProposal?.content?.length ? editProposal.content : DEFAULT_SECTIONS;

  const [clientId, setClientId] = useState(editProposal?.client_id ?? "");
  const [projectId, setProjectId] = useState(editProposal?.project_id ?? "");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [title, setTitle] = useState(editProposal?.title ?? "");
  const [sections, setSections] = useState<ProposalSection[]>(initSections);
  const [loading, setLoading] = useState<"save" | "send" | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(0);
  const [sectionContexts, setSectionContexts] = useState<string[]>(initSections.map(() => ""));
  const [generating, setGenerating] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleClientChange(id: string) {
    setClientId(id);
    setProjectId("");
    if (!id) { setProjects([]); return; }
    const { data } = await (supabase as any).from("projects").select("id, name, status").eq("client_id", id).order("created_at", { ascending: false });
    setProjects(data ?? []);
  }

  function updateSection(i: number, key: keyof ProposalSection, value: string) {
    setSections(sections.map((s, idx) => idx === i ? { ...s, [key]: value } : s));
  }

  function removeSection(i: number) {
    setSections(sections.filter((_, idx) => idx !== i));
    setSectionContexts(sectionContexts.filter((_, idx) => idx !== i));
    setEditingIdx(null);
  }

  function addSection() {
    setSections([...sections, { heading: "New Section", body: "" }]);
    setSectionContexts([...sectionContexts, ""]);
    setEditingIdx(sections.length);
  }

  async function generateSection(i: number) {
    if (!title.trim()) {
      toast.error("Enter a proposal title first.");
      return;
    }
    const selectedClient = clients.find((c) => c.id === clientId);
    setGenerating(i);
    try {
      const res = await fetch("/api/proposals/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionHeading: sections[i].heading,
          context: sectionContexts[i],
          proposalTitle: title,
          clientName: selectedClient ? `${selectedClient.full_name}${selectedClient.business_name ? ` (${selectedClient.business_name})` : ""}` : "the client",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      updateSection(i, "body", json.content);
      toast.success("Section written by AI.");
    } catch (err: any) {
      toast.error(err?.message ?? "AI generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  async function save(sendNow = false) {
    if (!clientId || !title.trim()) {
      toast.error("Select a client and enter a title.");
      return;
    }
    setLoading(sendNow ? "send" : "save");

    const payload: Record<string, unknown> = {
      title: title.trim(),
      content: sections,
      status: sendNow ? "sent" : "draft",
      sent_at: sendNow ? new Date().toISOString() : null,
    };
    if (!isEditing) payload.client_id = clientId;
    if (projectId) payload.project_id = projectId;

    const query = isEditing
      ? (supabase as any).from("proposals").update(payload).eq("id", editProposal!.id).select().single()
      : (supabase as any).from("proposals").insert({ ...payload, client_id: clientId }).select().single();

    const { data, error } = await query;

    if (error) {
      console.error("Proposal save error:", error);
      if (error.message?.includes("row-level security") || error.code === "42501") {
        toast.error("Permission denied — make sure your profile has role 'admin' in Supabase.");
      } else if (error.message?.includes("project_id")) {
        toast.error("Missing column — run migration 003 in Supabase SQL editor first.");
      } else {
        toast.error(`Save failed: ${error.message}`);
      }
      setLoading(null);
      return;
    }

    // Generate PDF + send email notification in background (fire-and-forget)
    if (sendNow) {
      fetch("/api/proposals/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: data.id }),
      });
      fetch("/api/proposals/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: data.id }),
      }).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) console.error("Notify error:", json);
        else if (json.warning) console.warn("Notify warning:", json.warning);
      });
    }

    toast.success(sendNow ? "Proposal sent to client." : "Draft saved.");
    router.push(`/admin/proposals/${data.id}`);
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--secondary)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--foreground)",
    fontFamily: "var(--font-body)",
    fontSize: "0.875rem",
    padding: "0.625rem 0.875rem",
    width: "100%",
    outline: "none",
  };

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Left: builder */}
      <div className="col-span-3 space-y-5">
        {/* Meta */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold block mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Client</label>
            <select value={clientId} onChange={(e) => handleClientChange(e.target.value)} style={inputStyle}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}{c.business_name ? ` — ${c.business_name}` : ""}
                </option>
              ))}
            </select>
          </div>
          {projects.length > 0 && (
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold block mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Link to Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
                <option value="">No project link</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold block mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Content Retainer — March 2026"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {sections.map((s, i) => (
            <motion.div
              key={i}
              layout
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: `1px solid ${editingIdx === i ? "var(--ll-taupe)" : "var(--border)"}` }}
            >
              <div
                role="button"
                onClick={() => setEditingIdx(editingIdx === i ? null : i)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer"
              >
                <GripVertical size={14} style={{ color: "var(--ll-neutral)", flexShrink: 0 }} />
                <span className="flex-1 text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  {s.heading || "Untitled section"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSection(i); }}
                  style={{ color: "var(--ll-grey)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <AnimatePresence>
                {editingIdx === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-5 pb-5 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="mt-3">
                        <label className="text-xs uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Section heading</label>
                        <input type="text" value={s.heading} onChange={(e) => updateSection(i, "heading", e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                          AI context <span style={{ color: "var(--ll-neutral)", fontWeight: 400, textTransform: "none" }}>(brief notes for this section — e.g. pricing, scope details)</span>
                        </label>
                        <textarea
                          value={sectionContexts[i] ?? ""}
                          onChange={(e) => {
                            const updated = [...sectionContexts];
                            updated[i] = e.target.value;
                            setSectionContexts(updated);
                          }}
                          rows={2}
                          placeholder="e.g. $2,400/month retainer, 2 shoots, 8 social reels, 4 blog posts…"
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                        <button
                          onClick={() => generateSection(i)}
                          disabled={generating === i}
                          className="flex items-center gap-1.5 text-xs font-semibold mt-2 px-3 py-1.5 rounded-lg"
                          style={{
                            background: "var(--ll-taupe)",
                            color: "#fff",
                            fontFamily: "var(--font-body)",
                            opacity: generating === i ? 0.6 : 1,
                            cursor: generating === i ? "not-allowed" : "pointer",
                          }}
                        >
                          <Sparkles size={12} />
                          {generating === i ? "Writing…" : "Write with AI"}
                        </button>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Content</label>
                        <textarea
                          value={s.body}
                          onChange={(e) => updateSection(i, "body", e.target.value)}
                          rows={6}
                          placeholder="Write section content… or use AI above."
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          <button
            onClick={addSection}
            className="flex items-center gap-2 text-sm py-3 px-4"
            style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)", fontWeight: 600 }}
          >
            <Plus size={14} />
            Add section
          </button>
        </div>
      </div>

      {/* Right: actions */}
      <div className="col-span-2 space-y-4">
        <div
          className="rounded-2xl p-5 space-y-3 sticky top-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Actions</p>
          <div className="ll-rule" />

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => save(false)}
            disabled={!!loading}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{
              background: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-body)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading === "save" ? "Saving…" : "Save Draft"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => save(true)}
            disabled={!!loading}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{
              background: "#010101",
              color: "#ffffff",
              fontFamily: "var(--font-body)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading === "send" ? "Sending…" : "Send to Client"}
          </motion.button>

          <p className="text-xs text-center pt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Sending will notify the client and generate a PDF.
          </p>
        </div>

        {/* Sections summary */}
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            {sections.length} Sections
          </p>
          <div className="space-y-1.5">
            {sections.map((s, i) => (
              <button
                key={i}
                onClick={() => setEditingIdx(i)}
                className="w-full text-left text-xs py-1.5 px-2 rounded-lg transition-colors"
                style={{
                  background: editingIdx === i ? "rgba(156,132,122,0.1)" : "transparent",
                  color: editingIdx === i ? "var(--ll-taupe)" : "var(--ll-grey)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {s.heading || "Untitled"}
              </button>
            ))}
          </div>
        </div>

        {/* Saved proposals */}
        {savedProposals.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              Saved Proposals
            </p>
            <div className="space-y-1">
              {savedProposals.map((p) => {
                const statusColors: Record<string, string> = {
                  draft: "var(--ll-grey)",
                  sent: "var(--ll-taupe)",
                  accepted: "#276749",
                  declined: "#c53030",
                };
                return (
                  <a
                    key={p.id}
                    href={`/admin/proposals/${p.id}`}
                    className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[rgba(156,132,122,0.08)] transition-colors group"
                  >
                    <FileText size={13} className="mt-0.5 shrink-0" style={{ color: "var(--ll-neutral)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-snug" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                        {p.title}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        {p.profiles?.full_name ?? "—"}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-semibold capitalize shrink-0 mt-0.5"
                      style={{ color: statusColors[p.status] ?? "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                    >
                      {p.status}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
