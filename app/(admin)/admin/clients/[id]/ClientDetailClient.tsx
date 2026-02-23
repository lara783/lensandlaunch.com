"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Upload, FileDown, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";
import type { Profile, Project, Invoice, Proposal, Deliverable } from "@/lib/supabase/types";

type Tab = "timeline" | "invoices" | "calendar" | "documents" | "brand-kit" | "onboarding" | "proposals";

const TABS: { id: Tab; label: string }[] = [
  { id: "timeline",   label: "Timeline" },
  { id: "invoices",   label: "Invoices" },
  { id: "calendar",   label: "Calendar" },
  { id: "documents",  label: "Documents" },
  { id: "brand-kit",  label: "Brand Kit" },
  { id: "onboarding", label: "Onboarding" },
  { id: "proposals",  label: "Proposals" },
];

const EVENT_TYPES = ["shoot", "edit", "review", "publish", "meeting"] as const;
const EVENT_COLORS: Record<string, string> = {
  shoot: "#9c847a", edit: "#aba696", review: "#c2ba9b", publish: "#010101", meeting: "#696348",
};

interface Props {
  client: Profile;
  projects: Project[];
  invoices: Invoice[];
  proposals: Proposal[];
  deliverables: Deliverable[];
  documents: any[];
  calendarEvents: any[];
  brandKit: any | null;
  clientAssets: any[];
  activeProjectId: string | null;
}

function statusBg(s: string) {
  return ({ pending: "rgba(156,132,122,0.15)", paid: "rgba(72,187,120,0.12)", overdue: "rgba(229,62,62,0.1)", sent: "rgba(156,132,122,0.15)", accepted: "rgba(72,187,120,0.12)", declined: "rgba(229,62,62,0.1)", draft: "rgba(217,217,217,0.3)" } as Record<string,string>)[s] ?? "rgba(217,217,217,0.3)";
}
function statusText(s: string) {
  return ({ pending: "var(--ll-taupe)", paid: "#276749", overdue: "#c53030", sent: "var(--ll-taupe)", accepted: "#276749", declined: "#c53030", draft: "var(--ll-grey)" } as Record<string,string>)[s] ?? "var(--ll-grey)";
}
function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const inputStyle: React.CSSProperties = {
  background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 10,
  color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "0.875rem",
  padding: "0.5rem 0.75rem", outline: "none", width: "100%",
};

export default function ClientDetailClient({
  client, projects: initProjects, invoices, proposals,
  deliverables: initDeliverables, documents: initDocs,
  calendarEvents: initCalEvents, brandKit, clientAssets,
  activeProjectId: initActiveProjectId,
}: Props) {
  const [tab, setTab] = useState<Tab>("timeline");
  const [projects, setProjects] = useState(initProjects);
  const [activeProjectId, setActiveProjectId] = useState(initActiveProjectId);
  const [deliverables, setDeliverables] = useState(initDeliverables);
  const [documents, setDocuments] = useState(initDocs);
  const [calEvents, setCalEvents] = useState(initCalEvents);
  const [newItem, setNewItem] = useState("");
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docType, setDocType] = useState<"invoice" | "contract" | "other">("invoice");
  const [newEvtTitle, setNewEvtTitle] = useState("");
  const [newEvtDate, setNewEvtDate] = useState("");
  const [newEvtType, setNewEvtType] = useState("meeting");
  const [addingEvt, setAddingEvt] = useState(false);
  // Create project form
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState("retainer");
  const [creatingProject, setCreatingProject] = useState(false);

  const supabase = createClient();
  const rowBase = "flex items-center justify-between px-5 py-4 rounded-xl";
  const rowStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)" };

  /* ── Timeline ── */
  async function addDeliverable() {
    if (!newItem.trim() || !activeProjectId) return;
    const { data, error } = await (supabase as any).from("deliverables")
      .insert({ project_id: activeProjectId, title: newItem.trim(), sort_order: deliverables.length })
      .select().single();
    if (error) { toast.error("Failed to add."); return; }
    setDeliverables([...deliverables, data]);
    setNewItem("");
    toast.success("Deliverable added.");
  }

  async function toggleAgencyApproval(d: Deliverable) {
    const newVal = !d.agency_approved;
    setDeliverables(deliverables.map((x) => x.id === d.id ? { ...x, agency_approved: newVal } : x));
    await (supabase as any).from("deliverables").update({ agency_approved: newVal }).eq("id", d.id);
  }

  async function deleteDeliverable(id: string) {
    setDeliverables(deliverables.filter((d) => d.id !== id));
    await (supabase as any).from("deliverables").delete().eq("id", id);
    toast.success("Removed.");
  }

  /* ── Create project ── */
  async function createProject() {
    if (!newProjectName.trim()) { toast.error("Enter a project name."); return; }
    setCreatingProject(true);
    const { data, error } = await (supabase as any)
      .from("projects")
      .insert({ client_id: client.id, name: newProjectName.trim(), service_type: newProjectType, status: "active" })
      .select()
      .single();
    setCreatingProject(false);
    if (error) {
      console.error("Create project error:", error);
      toast.error(`Failed: ${error.message}`);
      return;
    }
    setProjects([data, ...projects]);
    setActiveProjectId(data.id);
    setNewProjectName("");
    setShowCreateProject(false);
    toast.success("Project created.");
  }

  /* ── Documents ── */
  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    if (!docName.trim()) { toast.error("Enter a document name first."); return; }
    setUploading(true);
    try {
      const path = `${client.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      const { data: doc, error: insertError } = await (supabase as any).from("documents")
        .insert({ project_id: activeProjectId, client_id: client.id, name: docName.trim(), description: docDesc.trim() || null, file_url: publicUrl, type: docType, size_bytes: file.size })
        .select().single();
      if (insertError) throw insertError;
      setDocuments([doc, ...documents]);
      setDocName(""); setDocDesc("");
      toast.success("Document uploaded.");
    } catch (err: any) {
      if (err?.message?.includes("Bucket not found") || err?.statusCode === "404") {
        toast.error("Storage bucket missing — click 'Setup storage' below first.");
      } else {
        toast.error(`Upload failed: ${err?.message ?? "unknown error"}`);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function deleteDocument(id: string) {
    setDocuments(documents.filter((d) => d.id !== id));
    await (supabase as any).from("documents").delete().eq("id", id);
    toast.success("Removed.");
  }

  async function initStorage() {
    toast.loading("Setting up storage buckets…");
    try {
      const res = await fetch("/api/admin/init-storage", { method: "POST" });
      const data = await res.json();
      toast.dismiss();
      const allOk = data.results?.every((r: any) => r.status === "ok");
      if (allOk) toast.success("Storage ready — you can now upload files.");
      else toast.error("Some buckets failed. Check Supabase storage.");
    } catch {
      toast.dismiss();
      toast.error("Setup failed.");
    }
  }

  /* ── Calendar ── */
  async function addCalEvent() {
    if (!newEvtTitle.trim() || !newEvtDate || !activeProjectId) return;
    setAddingEvt(true);
    const { data, error } = await (supabase as any).from("calendar_events")
      .insert({ project_id: activeProjectId, title: newEvtTitle.trim(), start_date: newEvtDate, type: newEvtType, color: EVENT_COLORS[newEvtType] })
      .select().single();
    setAddingEvt(false);
    if (error) { toast.error("Failed."); return; }
    setCalEvents([...calEvents, data].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date)));
    setNewEvtTitle(""); setNewEvtDate("");
    toast.success("Event added.");
  }

  async function deleteCalEvent(id: string) {
    setCalEvents(calEvents.filter((e: any) => e.id !== id));
    await (supabase as any).from("calendar_events").delete().eq("id", id);
    toast.success("Event removed.");
  }

  /* ── Onboarding steps ── */
  const onboardingSteps = [
    { label: "Logo uploaded",          done: !!brandKit?.logo_url },
    { label: "Brand colours set",      done: Array.isArray(brandKit?.colors) && brandKit.colors.length > 0 },
    { label: "Brand fonts chosen",     done: Array.isArray(brandKit?.fonts) && brandKit.fonts.length > 0 },
    { label: "Brand assets uploaded",  done: clientAssets.length > 0 },
    { label: "Proposal sent",          done: proposals.some((p: any) => p.status !== "draft") },
    { label: "Proposal accepted",      done: proposals.some((p: any) => p.status === "accepted") },
  ];
  const onboardingDone = onboardingSteps.filter((s) => s.done).length;

  return (
    <div>
      {/* Project context bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {projects.length > 0 ? (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{
                  background: activeProjectId === p.id ? "#010101" : "var(--secondary)",
                  color: activeProjectId === p.id ? "#fff" : "var(--ll-grey)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {p.name}
                <span className="ml-1.5 opacity-60">({p.status})</span>
              </button>
            ))
          ) : (
            <span className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              No projects yet — create one to enable Timeline, Calendar & Documents.
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreateProject((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
        >
          <Plus size={12} /> New project
        </button>
      </div>

      {/* Create project form */}
      <AnimatePresence>
        {showCreateProject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Create project</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Project name (e.g. March Content Retainer)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createProject()}
                  style={inputStyle}
                />
                <select value={newProjectType} onChange={(e) => setNewProjectType(e.target.value)} style={inputStyle}>
                  <option value="retainer">Retainer</option>
                  <option value="photography">Photography</option>
                  <option value="videography">Videography</option>
                  <option value="content_strategy">Content Strategy</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createProject}
                  disabled={creatingProject}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
                >
                  {creatingProject ? "Creating…" : "Create"}
                </button>
                <button
                  onClick={() => setShowCreateProject(false)}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl overflow-x-auto" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap"
            style={{
              background: tab === t.id ? "var(--card)" : "transparent",
              color: tab === t.id ? "var(--foreground)" : "var(--ll-grey)",
              fontFamily: "var(--font-body)",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* TIMELINE */}
        {tab === "timeline" && (
          <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!activeProjectId && <p className="text-sm mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No active project selected. Use "New project" above to create one.</p>}
            <div className="space-y-2 mb-4">
              {deliverables.map((d) => (
                <div key={d.id} className={rowBase} style={rowStyle}>
                  <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{d.title}</span>
                  <div className="flex items-center gap-4 shrink-0">
                    <button onClick={() => toggleAgencyApproval(d)} className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: d.agency_approved ? "rgba(156,132,122,0.15)" : "var(--secondary)", color: d.agency_approved ? "var(--ll-taupe)" : "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                      {d.agency_approved ? "L&L ✓" : "Mark done"}
                    </button>
                    <span className="text-xs" style={{ color: d.client_approved ? "var(--ll-taupe)" : "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Client: {d.client_approved ? "✓" : "pending"}</span>
                    <button onClick={() => deleteDeliverable(d.id)} style={{ color: "#c53030" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            {activeProjectId && (
              <div className="flex gap-2">
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDeliverable()} placeholder="Add deliverable…" className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)" }} />
                <button onClick={addDeliverable} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>Add</button>
              </div>
            )}
          </motion.div>
        )}

        {/* INVOICES */}
        {tab === "invoices" && (
          <motion.div key="invoices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className={rowBase} style={rowStyle}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{inv.invoice_number}</span>
                    <span className="text-xs ml-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Due {new Date(inv.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>${inv.amount.toFixed(2)}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: statusBg(inv.status), color: statusText(inv.status) }}>{inv.status}</span>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No invoices yet. Upload invoice PDFs via the Documents tab.</p>}
            </div>
          </motion.div>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {activeProjectId && (
              <div className="rounded-2xl p-5 mb-6 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Add calendar event</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input placeholder="Event title" value={newEvtTitle} onChange={(e) => setNewEvtTitle(e.target.value)} style={inputStyle} />
                  <input type="date" value={newEvtDate} onChange={(e) => setNewEvtDate(e.target.value)} style={inputStyle} />
                  <select value={newEvtType} onChange={(e) => setNewEvtType(e.target.value)} style={inputStyle}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <button onClick={addCalEvent} disabled={addingEvt} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                  <Plus size={14} /> Add event
                </button>
              </div>
            )}
            <div className="space-y-2">
              {calEvents.map((evt: any) => (
                <div key={evt.id} className={rowBase} style={rowStyle}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: evt.color ?? EVENT_COLORS[evt.type] ?? "#9c847a" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{evt.title}</p>
                      <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        {new Date(evt.start_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {evt.type}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => deleteCalEvent(evt.id)} style={{ color: "#c53030" }}><Trash2 size={14} /></button>
                </div>
              ))}
              {calEvents.length === 0 && <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No calendar events yet.</p>}
            </div>
          </motion.div>
        )}

        {/* DOCUMENTS */}
        {tab === "documents" && (
          <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {activeProjectId ? (
              <div className="rounded-2xl p-5 mb-6 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Upload file for this client</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="File name (e.g. Invoice #004)" value={docName} onChange={(e) => setDocName(e.target.value)} style={inputStyle} />
                  <input type="text" placeholder="Description (optional)" value={docDesc} onChange={(e) => setDocDesc(e.target.value)} style={inputStyle} />
                  <select value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)} style={inputStyle}>
                    <option value="invoice">Invoice</option>
                    <option value="contract">Contract</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer" style={{ background: uploading ? "var(--secondary)" : "#010101", color: uploading ? "var(--ll-grey)" : "#fff", fontFamily: "var(--font-body)" }}>
                    <Upload size={14} />
                    {uploading ? "Uploading…" : "Choose file & upload"}
                    <input type="file" className="hidden" onChange={uploadDocument} disabled={uploading} />
                  </label>
                  <button onClick={initStorage} className="text-xs px-3 py-2 rounded-xl" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                    Setup storage buckets
                  </button>
                </div>
                <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  First time? Click "Setup storage buckets" once, then upload files.
                </p>
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No project selected. Use "New project" above to create one.</p>
            )}
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className={rowBase} style={rowStyle}>
                  <div className="flex items-center gap-3 min-w-0">
                    <FileDown size={16} style={{ color: "var(--ll-taupe)", flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{doc.name}</p>
                      {doc.description && <p className="text-xs truncate" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{doc.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(156,132,122,0.1)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>{doc.type}</span>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>View</a>
                    <button onClick={() => deleteDocument(doc.id)} style={{ color: "#c53030" }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No documents yet.</p>}
            </div>
          </motion.div>
        )}

        {/* BRAND KIT */}
        {tab === "brand-kit" && (
          <motion.div key="brand-kit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!brandKit ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Client hasn&apos;t set up their brand kit yet.</p>
                <p className="text-xs mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>They&apos;ll see brand kit tasks on their Onboarding page.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {brandKit.logo_url && (
                  <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Logo</p>
                    <img src={brandKit.logo_url} alt="Brand logo" className="max-h-24 max-w-xs object-contain rounded-xl p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }} />
                  </div>
                )}
                {Array.isArray(brandKit.colors) && brandKit.colors.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Brand Colours</p>
                    <div className="flex flex-wrap gap-4">
                      {brandKit.colors.map((c: any, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div className="w-14 h-14 rounded-xl border-2" style={{ background: c.hex, borderColor: "var(--border)" }} />
                          <p className="text-xs font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{c.hex}</p>
                          <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{c.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(brandKit.fonts) && brandKit.fonts.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Brand Fonts</p>
                    <div className="space-y-2">
                      {brandKit.fonts.map((f: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                          <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{f.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(156,132,122,0.1)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>{f.source === "upload" ? "Custom" : "Google Font"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {clientAssets.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Brand Assets ({clientAssets.length})</p>
                    <div className="space-y-2">
                      {clientAssets.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{a.name}</p>
                            {a.size_bytes && <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{formatBytes(a.size_bytes)}</p>}
                          </div>
                          <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold shrink-0 ml-4" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>Download</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ONBOARDING */}
        {tab === "onboarding" && (
          <motion.div key="onboarding" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Client setup progress</p>
                <p className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{onboardingDone} / {onboardingSteps.length}</p>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((onboardingDone / onboardingSteps.length) * 100)}%`, background: "var(--ll-taupe)" }} />
              </div>
            </div>
            <div className="space-y-2">
              {onboardingSteps.map((step, i) => (
                <div key={i} className={rowBase} style={{ ...rowStyle, opacity: step.done ? 0.7 : 1 }}>
                  <div className="flex items-center gap-3">
                    <span style={{ color: step.done ? "var(--ll-taupe)" : "var(--ll-grey)" }}>
                      {step.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </span>
                    <p className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</p>
                  </div>
                  {step.done && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(156,132,122,0.15)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>Done</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* PROPOSALS */}
        {tab === "proposals" && (
          <motion.div key="proposals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {projects.map((proj) => {
              const pp = proposals.filter((p) => (p as any).project_id === proj.id);
              if (pp.length === 0) return null;
              return (
                <div key={proj.id} className="mb-6">
                  <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>{proj.name}</p>
                  <div className="space-y-2">
                    {pp.map((p) => (
                      <div key={p.id} className={rowBase} style={rowStyle}>
                        <span className="text-sm font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{p.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{new Date(p.created_at).toLocaleDateString("en-AU")}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: statusBg(p.status), color: statusText(p.status) }}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {proposals.filter((p) => !(p as any).project_id).map((p) => (
              <div key={p.id} className={`${rowBase} mb-2`} style={rowStyle}>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{p.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{new Date(p.created_at).toLocaleDateString("en-AU")}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: statusBg(p.status), color: statusText(p.status) }}>{p.status}</span>
                </div>
              </div>
            ))}
            {proposals.length === 0 && <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No proposals yet.</p>}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
