"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Sparkles, FileText, X } from "lucide-react";
import type { ProposalSection, PricingTier, ScopeItem } from "@/lib/supabase/types";

const DEFAULT_SECTIONS: ProposalSection[] = [
  { heading: "Overview", body: "" },
  { heading: "Scope of Work", body: "" },
  { heading: "Investment", body: "" },
  { heading: "Timeline", body: "" },
  { heading: "Next Steps", body: "" },
];

const DEFAULT_TIERS: PricingTier[] = [
  { name: "Essential", price: 0, period: "month", tagline: "", highlighted: false },
  { name: "Growth",    price: 0, period: "month", tagline: "", highlighted: true  },
  { name: "Premium",   price: 0, period: "month", tagline: "", highlighted: false },
];

function isInvestmentSection(heading: string) {
  return /invest|pric|cost|package/i.test(heading);
}

function isScopeSection(heading: string) {
  return /scope|inclus|what.s includ/i.test(heading);
}

function isTimelineSection(heading: string) {
  return /timeline|process|steps|what.*(expect|happen)|how it work/i.test(heading);
}

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

interface Service {
  id: string;
  category: string;
  name: string;
  charge_out_rate: number;
  unit: string;
  active: boolean;
}

const SERVICE_CATEGORY_ORDER = [
  "Strategy & Consulting",
  "Photography",
  "Video Production",
  "Content Strategy",
  "Script Writing & Teleprompter Setup",
  "Media Delivery",
  "Miscellaneous",
];

interface Props {
  clients: Client[];
  savedProposals: SavedProposal[];
  editProposal?: EditProposal;
  initialProjects?: Project[];
  services?: Service[];
}

export default function ProposalBuilderClient({ clients, savedProposals, editProposal, initialProjects = [], services = [] }: Props) {
  const isEditing = !!editProposal;
  const initSections = editProposal?.content?.length ? editProposal.content : DEFAULT_SECTIONS;
  // Pre-populate tiers for Investment sections that don't already have them
  const initSectionsNormalized = initSections.map((s) =>
    isInvestmentSection(s.heading) && !s.tiers?.length ? { ...s, tiers: DEFAULT_TIERS } : s
  );

  const [clientId, setClientId] = useState(editProposal?.client_id ?? "");
  const [projectId, setProjectId] = useState(editProposal?.project_id ?? "");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [title, setTitle] = useState(editProposal?.title ?? "");
  const [sections, setSections] = useState<ProposalSection[]>(initSectionsNormalized);
  const [loading, setLoading] = useState<"save" | "send" | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(0);
  const [sectionContexts, setSectionContexts] = useState<string[]>(initSectionsNormalized.map(() => ""));
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [genStep, setGenStep] = useState(-1); // index of section currently "being written"
  const genIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [proposalContext, setProposalContext] = useState("");
  const [tierMode, setTierMode] = useState<boolean[]>(
    // Investment sections default to tier mode on
    initSectionsNormalized.map((s) => !!(s as any).tiers?.length || isInvestmentSection(s.heading))
  );
  const [scopeMode, setScopeMode] = useState<boolean[]>(
    // Scope sections default to table mode on
    initSectionsNormalized.map((s) => !!(s as any).scopeItems?.length || isScopeSection(s.heading))
  );
  const [timelineMode, setTimelineMode] = useState<boolean[]>(
    // Timeline sections default to steps mode on
    initSectionsNormalized.map((s) => !!(s as any).timelineSteps?.length || isTimelineSection(s.heading))
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
    () => new Set(services.map((s) => s.id))
  );
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, number>>({});
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
    setTierMode(tierMode.filter((_, idx) => idx !== i));
    setScopeMode(scopeMode.filter((_, idx) => idx !== i));
    setTimelineMode(timelineMode.filter((_, idx) => idx !== i));
    setEditingIdx(null);
  }

  function addSection() {
    setSections([...sections, { heading: "New Section", body: "" }]);
    setSectionContexts([...sectionContexts, ""]);
    setTierMode([...tierMode, false]);
    setScopeMode([...scopeMode, false]);
    setTimelineMode([...timelineMode, false]);
    setEditingIdx(sections.length);
  }

  function toggleTierMode(i: number) {
    const next = [...tierMode];
    next[i] = !next[i];
    setTierMode(next);
    if (next[i]) {
      setSections(sections.map((s, si) =>
        si === i && !s.tiers?.length ? { ...s, tiers: DEFAULT_TIERS } : s
      ));
    } else {
      setSections(sections.map((s, si) => si === i ? { ...s, tiers: undefined } : s));
    }
  }

  function updateTier(sectionIdx: number, tierIdx: number, key: keyof PricingTier, value: string | number | boolean) {
    setSections(sections.map((s, si) =>
      si !== sectionIdx ? s : {
        ...s,
        tiers: (s.tiers ?? DEFAULT_TIERS).map((t, ti) =>
          ti !== tierIdx ? t : { ...t, [key]: value }
        ),
      }
    ));
  }

  function toggleScopeMode(i: number) {
    const next = [...scopeMode];
    next[i] = !next[i];
    setScopeMode(next);
    if (!next[i]) {
      setSections(sections.map((s, si) => si === i ? { ...s, scopeItems: undefined } : s));
    } else if (!sections[i].scopeItems?.length) {
      setSections(sections.map((s, si) => si === i ? { ...s, scopeItems: [] } : s));
    }
  }

  function addScopeItem(sectionIdx: number) {
    setSections(sections.map((s, si) => si !== sectionIdx ? s : {
      ...s,
      scopeItems: [...(s.scopeItems ?? []), { feature: "", essential: "", growth: "", premium: "" }],
    }));
  }

  function removeScopeItem(sectionIdx: number, itemIdx: number) {
    setSections(sections.map((s, si) => si !== sectionIdx ? s : {
      ...s,
      scopeItems: (s.scopeItems ?? []).filter((_, ii) => ii !== itemIdx),
    }));
  }

  function updateScopeItem(sectionIdx: number, itemIdx: number, key: keyof ScopeItem, value: string) {
    setSections(sections.map((s, si) => si !== sectionIdx ? s : {
      ...s,
      scopeItems: (s.scopeItems ?? []).map((item, ii) => ii !== itemIdx ? item : { ...item, [key]: value }),
    }));
  }

  function toggleTimelineMode(i: number) {
    const next = [...timelineMode];
    next[i] = !next[i];
    setTimelineMode(next);
    if (!next[i]) {
      setSections(sections.map((s, si) => si === i ? { ...s, timelineSteps: undefined } : s));
    } else if (!(sections[i] as any).timelineSteps?.length) {
      setSections(sections.map((s, si) => si === i ? { ...s, timelineSteps: [
        { step: 1, title: "", description: "" },
        { step: 2, title: "", description: "" },
        { step: 3, title: "", description: "" },
        { step: 4, title: "", description: "" },
      ] } : s));
    }
  }

  function addTimelineStep(sectionIdx: number) {
    const existing = ((sections[sectionIdx] as any).timelineSteps ?? []) as { step: number; title: string; description: string }[];
    setSections(sections.map((s, si) => si !== sectionIdx ? s : {
      ...s,
      timelineSteps: [...existing, { step: existing.length + 1, title: "", description: "" }],
    } as any));
  }

  function removeTimelineStep(sectionIdx: number, stepIdx: number) {
    const existing = ((sections[sectionIdx] as any).timelineSteps ?? []) as { step: number; title: string; description: string }[];
    const filtered = existing.filter((_, ii) => ii !== stepIdx).map((st, ii) => ({ ...st, step: ii + 1 }));
    setSections(sections.map((s, si) => si !== sectionIdx ? s : { ...s, timelineSteps: filtered } as any));
  }

  function updateTimelineStep(sectionIdx: number, stepIdx: number, key: "title" | "description", value: string) {
    const existing = ((sections[sectionIdx] as any).timelineSteps ?? []) as { step: number; title: string; description: string }[];
    setSections(sections.map((s, si) => si !== sectionIdx ? s : {
      ...s,
      timelineSteps: existing.map((st, ii) => ii !== stepIdx ? st : { ...st, [key]: value }),
    } as any));
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function buildSelectedServicesPayload() {
    return services
      .filter((s) => selectedServiceIds.has(s.id))
      .map((s) => ({
        category: s.category,
        name: s.name,
        rate: serviceOverrides[s.id] ?? s.charge_out_rate,
        unit: s.unit,
      }));
  }

  const groupedServices = SERVICE_CATEGORY_ORDER.reduce((acc, cat) => {
    const items = services.filter((s) => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, Service[]>);

  async function generateAll() {
    if (!title.trim()) { toast.error("Enter a proposal title first."); return; }
    if (!proposalContext.trim()) { toast.error("Add some context about this proposal first."); return; }
    const selectedClient = clients.find((c) => c.id === clientId);
    setGeneratingAll(true);
    setGenStep(0);
    // Animate through section names while waiting for the API
    let stepIdx = 0;
    genIntervalRef.current = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, sections.length - 1);
      setGenStep(stepIdx);
    }, Math.max(1800, (sections.length > 0 ? 12000 / sections.length : 2500)));
    try {
      const res = await fetch("/api/proposals/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalTitle: title,
          clientName: selectedClient ? `${selectedClient.full_name}${selectedClient.business_name ? ` (${selectedClient.business_name})` : ""}` : "the client",
          context: proposalContext,
          sections: sections.map((s, i) => ({
            heading: s.heading,
            useTiers: tierMode[i] && isInvestmentSection(s.heading),
            useScopeTable: scopeMode[i] && isScopeSection(s.heading),
            useTimeline: timelineMode[i] && isTimelineSection(s.heading),
          })),
          selectedServices: buildSelectedServicesPayload(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      // Distribute AI output into each section
      setSections((prev) => prev.map((s, i) => {
        const result = json.sections?.[s.heading];
        if (!result) return s;
        if (typeof result === "object" && result.tiers) {
          return { ...s, body: result.body ?? "", tiers: result.tiers };
        }
        if (typeof result === "object" && result.scopeItems) {
          return { ...s, body: result.body ?? "", scopeItems: result.scopeItems };
        }
        if (typeof result === "object" && (result as any).timelineSteps) {
          return { ...s, body: (result as any).body ?? "", timelineSteps: (result as any).timelineSteps };
        }
        return { ...s, body: typeof result === "string" ? result : s.body };
      }));
      toast.success("Full proposal written by AI.");
    } catch (err: any) {
      toast.error(err?.message ?? "AI generation failed.");
    } finally {
      if (genIntervalRef.current) clearInterval(genIntervalRef.current);
      setGeneratingAll(false);
      setGenStep(-1);
    }
  }

  async function generateSection(i: number) {
    if (!title.trim()) {
      toast.error("Enter a proposal title first.");
      return;
    }
    const selectedClient = clients.find((c) => c.id === clientId);
    const useTiers = tierMode[i] && isInvestmentSection(sections[i].heading);
    const useScopeTable = scopeMode[i] && isScopeSection(sections[i].heading);
    const useTimeline = timelineMode[i] && isTimelineSection(sections[i].heading);
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
          useTiers,
          useScopeTable,
          useTimeline,
          selectedServices: buildSelectedServicesPayload(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      if (useTiers) {
        try {
          const parsed = JSON.parse(json.content);
          setSections(sections.map((s, si) => si !== i ? s : { ...s, tiers: parsed.tiers, body: parsed.body ?? "" }));
        } catch {
          updateSection(i, "body", json.content);
        }
      } else if (useScopeTable) {
        try {
          const parsed = JSON.parse(json.content);
          setSections(sections.map((s, si) => si !== i ? s : { ...s, scopeItems: parsed.scopeItems, body: parsed.body ?? "" }));
        } catch {
          updateSection(i, "body", json.content);
        }
      } else if (useTimeline) {
        try {
          const parsed = JSON.parse(json.content);
          setSections(sections.map((s, si) => si !== i ? s : { ...s, timelineSteps: parsed.timelineSteps, body: parsed.body ?? "" } as any));
        } catch {
          updateSection(i, "body", json.content);
        }
      } else {
        updateSection(i, "body", json.content);
      }
      toast.success("Section written by AI.");
    } catch (err: any) {
      toast.error(err?.message ?? "AI generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  async function generateTitle() {
    if (!proposalContext.trim()) { toast.error("Add context first so AI knows what to title it."); return; }
    const selectedClient = clients.find((c) => c.id === clientId);
    setGeneratingTitle(true);
    try {
      const res = await fetch("/api/proposals/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: selectedClient?.full_name ?? "",
          businessName: selectedClient?.business_name ?? "",
          context: proposalContext,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      if (json.title) setTitle(json.title);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not generate title.");
    } finally {
      setGeneratingTitle(false);
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Title</label>
              <button type="button" onClick={generateTitle} disabled={generatingTitle || !proposalContext.trim()}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: "rgba(156,132,122,0.1)", color: "var(--ll-taupe)", border: "1px solid rgba(156,132,122,0.2)", fontFamily: "var(--font-body)", cursor: generatingTitle || !proposalContext.trim() ? "not-allowed" : "pointer", opacity: !proposalContext.trim() ? 0.4 : 1 }}>
                <Sparkles size={9} />
                {generatingTitle ? "Generating…" : "Generate"}
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Content Retainer — March 2026"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Generate full proposal with one prompt */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "var(--ll-taupe)" }} />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
              Generate full proposal with AI
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Write one brief — Claude writes every section at once and fills them in automatically.
          </p>
          <textarea
            value={proposalContext}
            onChange={(e) => setProposalContext(e.target.value)}
            rows={4}
            placeholder="Describe this proposal in detail — e.g. Monthly content retainer for a Sunshine Coast café. Includes 2 shoot days, 8 reels, 4 carousels, weekly scheduling. Client is design-forward, wants minimal text. Essential $2,100/mo, Growth $2,800/mo, Premium $4,200/mo."
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <button
            onClick={generateAll}
            disabled={generatingAll}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
            style={{
              background: generatingAll ? "var(--ll-neutral)" : "#010101",
              color: "#fff",
              fontFamily: "var(--font-body)",
              cursor: generatingAll ? "not-allowed" : "pointer",
            }}
          >
            <Sparkles size={13} />
            {generatingAll ? "Writing full proposal…" : "Write entire proposal with AI"}
          </button>

          {/* Progress bar shown while generating */}
          {generatingAll && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {genStep >= 0 && genStep < sections.length
                    ? `Writing "${sections[genStep].heading}"…`
                    : "Preparing…"}
                </p>
                <p className="text-xs" style={{ color: "var(--ll-neutral)", fontFamily: "var(--font-body)" }}>
                  {genStep + 1} / {sections.length}
                </p>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(156,132,122,0.15)" }}>
                <motion.div
                  animate={{ width: `${Math.round(((genStep + 1) / sections.length) * 90)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ height: "100%", background: "var(--ll-taupe)", borderRadius: 99 }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sections.map((s, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: i < genStep ? "rgba(156,132,122,0.15)" : i === genStep ? "rgba(156,132,122,0.25)" : "transparent",
                      color: i <= genStep ? "var(--ll-taupe)" : "var(--ll-neutral)",
                      border: i === genStep ? "1px solid rgba(156,132,122,0.4)" : "1px solid transparent",
                      fontFamily: "var(--font-body)",
                      fontWeight: i === genStep ? 600 : 400,
                    }}>
                    {s.heading}
                  </span>
                ))}
              </div>
            </div>
          )}
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
                      {isInvestmentSection(s.heading) && (
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => toggleTierMode(i)}
                            className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                            style={{ background: tierMode[i] ? "#010101" : "var(--border)" }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow block transition-transform"
                              style={{ transform: tierMode[i] ? "translateX(18px)" : "translateX(2px)" }}
                            />
                          </button>
                          <span
                            className="text-xs font-semibold cursor-pointer select-none"
                            onClick={() => toggleTierMode(i)}
                            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                          >
                            Use tiered pricing (3 cards)
                          </span>
                        </div>
                      )}
                      {isScopeSection(s.heading) && (
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => toggleScopeMode(i)}
                            className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                            style={{ background: scopeMode[i] ? "#010101" : "var(--border)" }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow block transition-transform"
                              style={{ transform: scopeMode[i] ? "translateX(18px)" : "translateX(2px)" }}
                            />
                          </button>
                          <span
                            className="text-xs font-semibold cursor-pointer select-none"
                            onClick={() => toggleScopeMode(i)}
                            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                          >
                            Use comparison table (3 plans)
                          </span>
                        </div>
                      )}
                      {isTimelineSection(s.heading) && (
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => toggleTimelineMode(i)}
                            className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                            style={{ background: timelineMode[i] ? "#010101" : "var(--border)" }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow block transition-transform"
                              style={{ transform: timelineMode[i] ? "translateX(18px)" : "translateX(2px)" }}
                            />
                          </button>
                          <span
                            className="text-xs font-semibold cursor-pointer select-none"
                            onClick={() => toggleTimelineMode(i)}
                            style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}
                          >
                            Use numbered timeline steps
                          </span>
                        </div>
                      )}
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
                          placeholder={tierMode[i] && isInvestmentSection(s.heading)
                            ? "e.g. Essential $2,100/mo starter, Growth $2,800/mo most popular, Premium $4,200/mo full service"
                            : scopeMode[i] && isScopeSection(s.heading)
                            ? "e.g. 3 plans — Essential 1 shoot, Growth 2 shoots, Premium 3 shoots + video"
                            : timelineMode[i] && isTimelineSection(s.heading)
                            ? "e.g. onboarding call, shoot day, editing & review, content delivery"
                            : "e.g. $2,400/month retainer, 2 shoots, 8 social reels, 4 blog posts…"}
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
                          {generating === i ? "Writing…" : tierMode[i] && isInvestmentSection(s.heading) ? "Generate 3 tiers with AI" : scopeMode[i] && isScopeSection(s.heading) ? "Generate scope table with AI" : timelineMode[i] && isTimelineSection(s.heading) ? "Generate timeline steps with AI" : "Write with AI"}
                        </button>
                      </div>
                      {tierMode[i] && isInvestmentSection(s.heading) ? (
                        <div className="grid grid-cols-3 gap-3">
                          {(s.tiers ?? DEFAULT_TIERS).map((tier, ti) => (
                            <div key={ti} className="rounded-xl p-3.5 space-y-2.5"
                              style={{
                                border: `1px solid ${tier.highlighted ? "var(--ll-taupe)" : "var(--border)"}`,
                                background: tier.highlighted ? "rgba(156,132,122,0.06)" : "var(--secondary)",
                              }}>
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider"
                                  style={{ color: tier.highlighted ? "var(--ll-taupe)" : "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                                  {tier.name}
                                </p>
                                {tier.highlighted && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                    style={{ background: "var(--ll-taupe)", color: "#fff", fontFamily: "var(--font-body)" }}>
                                    Popular
                                  </span>
                                )}
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Price ($)</label>
                                <input
                                  type="number"
                                  value={tier.price || ""}
                                  onChange={(e) => updateTier(i, ti, "price", Number(e.target.value))}
                                  placeholder="2100"
                                  style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Period</label>
                                <select
                                  value={tier.period}
                                  onChange={(e) => updateTier(i, ti, "period", e.target.value)}
                                  style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                                >
                                  <option value="month">/ month</option>
                                  <option value="project">/ project</option>
                                  <option value="one-off">one-off</option>
                                  <option value="">no period</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Tagline</label>
                                <input
                                  type="text"
                                  value={tier.tagline}
                                  onChange={(e) => updateTier(i, ti, "tagline", e.target.value)}
                                  placeholder="e.g. Perfect for getting started"
                                  style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : scopeMode[i] && isScopeSection(s.heading) ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Scope table</label>
                            <button
                              type="button"
                              onClick={() => addScopeItem(i)}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                              style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                            >
                              <Plus size={11} /> Add row
                            </button>
                          </div>
                          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                            <div
                              className="grid text-[10px] uppercase tracking-wider font-semibold px-3 py-2"
                              style={{ gridTemplateColumns: "1fr 90px 90px 90px 28px", background: "var(--secondary)", color: "var(--ll-grey)", fontFamily: "var(--font-body)", borderBottom: "1px solid var(--border)" }}
                            >
                              <span>Feature</span>
                              <span className="text-center">Essential</span>
                              <span className="text-center">Growth</span>
                              <span className="text-center">Premium</span>
                              <span />
                            </div>
                            {((s as any).scopeItems ?? []).map((item: ScopeItem, si: number) => (
                              <div
                                key={si}
                                className="grid px-3 py-2 items-center gap-x-2"
                                style={{ gridTemplateColumns: "1fr 90px 90px 90px 28px", borderBottom: "1px solid var(--border)" }}
                              >
                                <input type="text" value={item.feature} onChange={(e) => updateScopeItem(i, si, "feature", e.target.value)} placeholder="e.g. Monthly shoots" style={{ ...inputStyle, fontSize: "0.75rem", padding: "0.4rem 0.6rem" }} />
                                <input type="text" value={item.essential} onChange={(e) => updateScopeItem(i, si, "essential", e.target.value)} placeholder="✓ / 1x / —" style={{ ...inputStyle, fontSize: "0.75rem", padding: "0.4rem 0.6rem", textAlign: "center" }} />
                                <input type="text" value={item.growth} onChange={(e) => updateScopeItem(i, si, "growth", e.target.value)} placeholder="✓ / 2x / —" style={{ ...inputStyle, fontSize: "0.75rem", padding: "0.4rem 0.6rem", textAlign: "center" }} />
                                <input type="text" value={item.premium} onChange={(e) => updateScopeItem(i, si, "premium", e.target.value)} placeholder="✓ / 3x / —" style={{ ...inputStyle, fontSize: "0.75rem", padding: "0.4rem 0.6rem", textAlign: "center" }} />
                                <button type="button" onClick={() => removeScopeItem(i, si)} style={{ color: "var(--ll-grey)" }}>
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            {((s as any).scopeItems ?? []).length === 0 && (
                              <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--ll-neutral)", fontFamily: "var(--font-body)" }}>
                                No rows yet — click "Add row" or use AI to generate.
                              </div>
                            )}
                          </div>
                          <div className="mt-3">
                            <label className="text-xs uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Intro paragraph (optional)</label>
                            <textarea
                              value={s.body}
                              onChange={(e) => updateSection(i, "body", e.target.value)}
                              rows={3}
                              placeholder="Brief intro above the table…"
                              style={{ ...inputStyle, resize: "vertical" }}
                            />
                          </div>
                        </div>
                      ) : timelineMode[i] && isTimelineSection(s.heading) ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Timeline steps</label>
                            <button
                              type="button"
                              onClick={() => addTimelineStep(i)}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                              style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                            >
                              <Plus size={11} /> Add step
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(((s as any).timelineSteps ?? []) as { step: number; title: string; description: string }[]).map((st, si) => (
                              <div key={si} className="flex gap-3 items-start p-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1"
                                  style={{ background: "rgba(156,132,122,0.15)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                                  {st.step}
                                </div>
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <input
                                    type="text"
                                    value={st.title}
                                    onChange={(e) => updateTimelineStep(i, si, "title", e.target.value)}
                                    placeholder="Step title (e.g. Creative Direction Call)"
                                    style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
                                  />
                                  <textarea
                                    value={st.description}
                                    onChange={(e) => updateTimelineStep(i, si, "description", e.target.value)}
                                    placeholder="1-2 sentences describing what happens…"
                                    rows={2}
                                    style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.4rem 0.6rem", resize: "vertical" }}
                                  />
                                </div>
                                <button type="button" onClick={() => removeTimelineStep(i, si)} style={{ color: "var(--ll-grey)", marginTop: 4 }}>
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            {(((s as any).timelineSteps ?? []) as any[]).length === 0 && (
                              <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--ll-neutral)", fontFamily: "var(--font-body)" }}>
                                No steps yet — click "Add step" or use AI to generate.
                              </div>
                            )}
                          </div>
                          <div className="mt-3">
                            <label className="text-xs uppercase tracking-wider font-semibold block mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Intro paragraph (optional)</label>
                            <textarea
                              value={s.body}
                              onChange={(e) => updateSection(i, "body", e.target.value)}
                              rows={2}
                              placeholder="Brief intro above the steps…"
                              style={{ ...inputStyle, resize: "vertical" }}
                            />
                          </div>
                        </div>
                      ) : (
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
                      )}
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
          className="rounded-2xl p-5 space-y-3 sticky top-6 z-10"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
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

        {/* Services selector */}
        {Object.keys(groupedServices).length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs uppercase tracking-wider font-semibold mb-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              Services in this proposal
            </p>
            <p className="text-[11px] mb-3" style={{ color: "var(--ll-neutral)", fontFamily: "var(--font-body)" }}>
              Toggle what to quote. Override any price for this proposal only.
            </p>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-0.5">
              {Object.entries(groupedServices).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-1.5"
                    style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                    {cat}
                  </p>
                  <div className="space-y-1">
                    {items.map((s) => {
                      const isOn = selectedServiceIds.has(s.id);
                      const effectiveRate = serviceOverrides[s.id] ?? s.charge_out_rate;
                      return (
                        <div key={s.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleService(s.id)}
                            className="relative w-7 h-3.5 rounded-full transition-colors shrink-0"
                            style={{ background: isOn ? "var(--ll-taupe)" : "var(--border)" }}
                          >
                            <span
                              className="absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow block transition-transform"
                              style={{ transform: isOn ? "translateX(14px)" : "translateX(2px)" }}
                            />
                          </button>
                          <span
                            className="flex-1 text-xs truncate"
                            style={{
                              color: isOn ? "var(--foreground)" : "var(--ll-neutral)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            {s.name}
                          </span>
                          <input
                            type="number"
                            value={effectiveRate}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v >= 0) setServiceOverrides((prev) => ({ ...prev, [s.id]: v }));
                            }}
                            className="w-16 text-right text-xs rounded px-1.5 py-0.5 outline-none"
                            style={{
                              background: "var(--secondary)",
                              border: `1px solid ${serviceOverrides[s.id] !== undefined ? "var(--ll-taupe)" : "var(--border)"}`,
                              color: "var(--foreground)",
                              fontFamily: "var(--font-body)",
                              opacity: isOn ? 1 : 0.35,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-3" style={{ color: "var(--ll-neutral)", fontFamily: "var(--font-body)" }}>
              {selectedServiceIds.size} of {services.length} services selected
            </p>
          </div>
        )}

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
