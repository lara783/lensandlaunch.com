"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Upload, FileDown, Trash2, Plus, CheckCircle2, Circle, Pencil, X, Video,
  ChevronDown, ChevronUp, BarChart2, TrendingUp, MessageSquare, Users,
  RefreshCw, Settings, ExternalLink, Wifi, WifiOff, AlertTriangle,
} from "lucide-react";
import type { Profile, Project, Invoice, Proposal, Deliverable } from "@/lib/supabase/types";

type Tab =
  | "timeline" | "invoices" | "calendar" | "brief"
  | "meetings" | "analytics" | "documents"
  | "brand-kit" | "onboarding" | "proposals";

const TABS: { id: Tab; label: string }[] = [
  { id: "timeline",   label: "Timeline" },
  { id: "invoices",   label: "Invoices" },
  { id: "calendar",   label: "Calendar" },
  { id: "brief",      label: "Brief" },
  { id: "meetings",   label: "Meetings" },
  { id: "analytics",  label: "Analytics" },
  { id: "documents",  label: "Documents" },
  { id: "brand-kit",  label: "Brand Kit" },
  { id: "onboarding", label: "Onboarding" },
  { id: "proposals",  label: "Proposals" },
];

const EVENT_TYPES = ["shoot", "edit", "review", "publish", "meeting"] as const;
const EVENT_COLORS: Record<string, string> = {
  shoot: "#9c847a", edit: "#aba696", review: "#c2ba9b", publish: "#010101", meeting: "#696348",
};

const MEETING_TYPES = [
  { value: "creative_direction", label: "Creative Direction" },
  { value: "strategy",           label: "Strategy" },
  { value: "review",             label: "Review" },
  { value: "kickoff",            label: "Kickoff" },
  { value: "analytics",          label: "Analytics" },
  { value: "other",              label: "Other" },
];

const PLATFORMS = [
  { value: "instagram", label: "Instagram", color: "#E1306C" },
  { value: "facebook",  label: "Facebook",  color: "#1877F2" },
  { value: "tiktok",    label: "TikTok",    color: "#010101" },
  { value: "all",       label: "All",       color: "#696348" },
];

type MetaPage = { id: string; name: string; access_token: string; ig_account_id: string | null };

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
  meetingLogs: any[];
  analytics: any[];
  metaPages: MetaPage[] | null;
  metaError: string | null;
  metaConnected: boolean;
  tiktokConnected: boolean;
  tiktokError: string | null;
  initialTab: Tab | null;
}

function statusBg(s: string) {
  return ({ pending: "rgba(156,132,122,0.15)", paid: "rgba(72,187,120,0.12)", overdue: "rgba(229,62,62,0.1)", sent: "rgba(156,132,122,0.15)", accepted: "rgba(72,187,120,0.12)", declined: "rgba(229,62,62,0.1)", draft: "rgba(217,217,217,0.3)" } as Record<string, string>)[s] ?? "rgba(217,217,217,0.3)";
}
function statusText(s: string) {
  return ({ pending: "var(--ll-taupe)", paid: "#276749", overdue: "#c53030", sent: "var(--ll-taupe)", accepted: "#276749", declined: "#c53030", draft: "var(--ll-grey)" } as Record<string, string>)[s] ?? "var(--ll-grey)";
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
const taStyle: React.CSSProperties = { ...inputStyle, resize: "vertical" };

export default function ClientDetailClient({
  client, projects: initProjects, invoices: initInvoices, proposals,
  deliverables: initDeliverables, documents: initDocs,
  calendarEvents: initCalEvents, brandKit, clientAssets,
  activeProjectId: initActiveProjectId,
  meetingLogs: initMeetingLogs,
  analytics: initAnalytics,
  metaPages: initMetaPages,
  metaError,
  metaConnected,
  tiktokConnected: initTiktokConnected,
  tiktokError,
  initialTab,
}: Props) {
  const [tab, setTab] = useState<Tab>(
    initialTab ?? (initMetaPages || metaConnected || metaError ? "analytics" : "timeline")
  );
  const [projects, setProjects] = useState(initProjects);
  const [activeProjectId, setActiveProjectId] = useState(initActiveProjectId);
  const [deliverables, setDeliverables] = useState(initDeliverables);
  const [documents, setDocuments] = useState(initDocs);
  const [calEvents, setCalEvents] = useState(initCalEvents);
  const [meetingLogs, setMeetingLogs] = useState<any[]>(initMeetingLogs);
  const [analytics, setAnalytics] = useState<any[]>(initAnalytics);
  const [invoices, setInvoices] = useState<Invoice[]>(initInvoices);

  // Invoice creation form
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [newInvNumber, setNewInvNumber] = useState("");
  const [newInvAmount, setNewInvAmount] = useState("");
  const [newInvDue, setNewInvDue] = useState("");
  const [newInvStatus, setNewInvStatus] = useState<"pending" | "paid" | "overdue">("pending");
  const [newInvPaymentType, setNewInvPaymentType] = useState<"standard" | "deposit" | "balance">("standard");
  const [newInvNotes, setNewInvNotes] = useState("");
  const [newInvLineItems, setNewInvLineItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Deliverable form
  const [newItem, setNewItem] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadingVideoFor, setUploadingVideoFor] = useState<string | null>(null);
  const [contentUrls, setContentUrls] = useState<Record<string, string>>(
    Object.fromEntries(initDeliverables.map((d) => [d.id, d.content_url ?? ""]))
  );

  // Document form
  const [docName, setDocName] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docType, setDocType] = useState<"invoice" | "contract" | "other">("invoice");

  // Calendar event form
  const [newEvtTitle, setNewEvtTitle] = useState("");
  const [newEvtDate, setNewEvtDate] = useState("");
  const [newEvtTime, setNewEvtTime] = useState("09:00");
  const [newEvtType, setNewEvtType] = useState("meeting");
  const [newEvtAttendees, setNewEvtAttendees] = useState("");
  const [newEvtMtgType, setNewEvtMtgType] = useState("creative_direction");
  const [addingEvt, setAddingEvt] = useState(false);
  const [editingEvt, setEditingEvt] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("09:00");
  const [editType, setEditType] = useState("meeting");
  const [editNotes, setEditNotes] = useState("");
  const [savingEvt, setSavingEvt] = useState(false);

  // Create project form
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState("retainer");
  const [creatingProject, setCreatingProject] = useState(false);

  // Project brief
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const [briefLocation, setBriefLocation] = useState(activeProject?.shoot_location ?? "");
  const [briefCallTime, setBriefCallTime] = useState(activeProject?.call_time ?? "");
  const [briefAccess, setBriefAccess] = useState(activeProject?.access_notes ?? "");
  const [briefMoodBoard, setBriefMoodBoard] = useState(activeProject?.mood_board_url ?? "");
  const [briefInternal, setBriefInternal] = useState(activeProject?.internal_brief ?? "");
  const [savingBrief, setSavingBrief] = useState(false);

  // Brand voice
  const [voiceTone, setVoiceTone] = useState(brandKit?.voice_tone ?? "");
  const [voiceAudience, setVoiceAudience] = useState(brandKit?.voice_audience ?? "");
  const [voiceMessaging, setVoiceMessaging] = useState(brandKit?.voice_messaging ?? "");
  const [voiceWordsUse, setVoiceWordsUse] = useState(brandKit?.voice_words_use ?? "");
  const [voiceWordsAvoid, setVoiceWordsAvoid] = useState(brandKit?.voice_words_avoid ?? "");
  const [voiceTagline, setVoiceTagline] = useState(brandKit?.voice_tagline ?? "");
  const [savingVoice, setSavingVoice] = useState(false);

  // Meeting log form
  const [newMtgTitle, setNewMtgTitle] = useState("");
  const [newMtgDate, setNewMtgDate] = useState("");
  const [newMtgType, setNewMtgType] = useState("creative_direction");
  const [newMtgAttendees, setNewMtgAttendees] = useState("");
  const [newMtgNotes, setNewMtgNotes] = useState("");
  const [newMtgContent, setNewMtgContent] = useState("");
  const [newMtgActions, setNewMtgActions] = useState("");
  const [savingMtg, setSavingMtg] = useState(false);
  const [expandedMtg, setExpandedMtg] = useState<string | null>(null);
  const [editingMtg, setEditingMtg] = useState<any | null>(null);

  // Analytics form
  const [newAnalStart, setNewAnalStart] = useState("");
  const [newAnalEnd, setNewAnalEnd] = useState("");
  const [newAnalReach, setNewAnalReach] = useState("");
  const [newAnalImpressions, setNewAnalImpressions] = useState("");
  const [newAnalEngRate, setNewAnalEngRate] = useState("");
  const [newAnalNewFollowers, setNewAnalNewFollowers] = useState("");
  const [newAnalTotalFollowers, setNewAnalTotalFollowers] = useState("");
  const [newAnalTopPost, setNewAnalTopPost] = useState("");
  const [newAnalNotes, setNewAnalNotes] = useState("");
  const [savingAnal, setSavingAnal] = useState(false);

  // Analytics access toggle (paid feature gate)
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>((client as any).analytics_enabled ?? false);
  const [togglingAnalytics, setTogglingAnalytics] = useState(false);

  async function toggleAnalyticsAccess() {
    setTogglingAnalytics(true);
    const next = !analyticsEnabled;
    setAnalyticsEnabled(next);
    const { error } = await supabase.from("profiles").update({ analytics_enabled: next } as any).eq("id", client.id);
    if (error) { setAnalyticsEnabled(!next); toast.error("Failed to update analytics access."); }
    else toast.success(next ? "Analytics enabled for client." : "Analytics hidden from client.");
    setTogglingAnalytics(false);
  }

  // Onboarding unlock (manual, after contract signing)
  const [onboardingUnlocked, setOnboardingUnlocked] = useState<boolean>((client as any).onboarding_unlocked ?? false);
  const [unlocking, setUnlocking] = useState(false);

  const router = useRouter();

  // Delete client
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteClient() {
    setDeleting(true);
    const res = await fetch("/api/admin/delete-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to delete client."); return; }
    toast.success(`${client.full_name} deleted.`);
    router.push("/admin/clients");
    router.refresh();
  }

  async function unlockOnboarding() {
    setUnlocking(true);
    const { error } = await supabase.from("profiles").update({ onboarding_unlocked: true } as any).eq("id", client.id);
    if (error) { toast.error("Failed to unlock onboarding."); }
    else { setOnboardingUnlocked(true); toast.success("Onboarding unlocked — client can now complete their setup."); }
    setUnlocking(false);
  }

  // Meta Business Suite
  const [metaToken, setMetaToken] = useState<string>((client as any).meta_page_token ?? "");
  const [metaFbPageId, setMetaFbPageId] = useState<string>((client as any).meta_fb_page_id ?? "");
  const [metaIgId, setMetaIgId] = useState<string>((client as any).meta_ig_account_id ?? "");
  const [metaSyncedAt, setMetaSyncedAt] = useState<string | null>((client as any).meta_token_synced_at ?? null);
  const [showMetaConfig, setShowMetaConfig] = useState(false);
  const [metaInsights, setMetaInsights] = useState<any | null>(null);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [savingMetaCreds, setSavingMetaCreds] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  // Meta page picker (populated from OAuth callback redirect)
  const [metaPages, setMetaPages] = useState<MetaPage[] | null>(initMetaPages ?? null);
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);
  const [savingPagePick, setSavingPagePick] = useState(false);

  // TikTok
  const [tiktokSyncedAt, setTiktokSyncedAt] = useState<string | null>((client as any).tiktok_token_synced_at ?? null);
  const [showTiktokConfig, setShowTiktokConfig] = useState(false);
  const [tiktokInsights, setTiktokInsights] = useState<any | null>(null);
  const [syncingTiktok, setSyncingTiktok] = useState(false);
  const [tiktokIsConnected, setTiktokIsConnected] = useState(
    initTiktokConnected || !!((client as any).tiktok_access_token)
  );

  // Analytics platform tab
  const [analyticsTab, setAnalyticsTab] = useState<"instagram" | "facebook" | "tiktok" | "all">("instagram");

  const supabase = createClient();

  // Show toasts from OAuth redirect params
  useEffect(() => {
    if (metaError) toast.error(`Meta connection failed: ${metaError}`);
    if (metaConnected) toast.success("Meta connected! Click Sync Meta to pull data.");
    if (tiktokError) toast.error(`TikTok connection failed: ${tiktokError}`);
    if (initTiktokConnected) {
      setTiktokIsConnected(true);
      toast.success("TikTok connected! Click Sync TikTok to pull data.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rowBase = "flex items-center justify-between px-5 py-4 rounded-xl";
  const rowStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)" };

  /* ── Timeline ── */
  function toggleNewTag(tag: string) {
    setNewTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function loadDeliverablesForProject(projectId: string) {
    const { data } = await (supabase as any)
      .from("deliverables").select("*").eq("project_id", projectId).order("sort_order");
    if (data) {
      setDeliverables(data);
      setContentUrls(Object.fromEntries(data.map((d: Deliverable) => [d.id, d.content_url ?? ""])));
    }
  }

  async function addDeliverable() {
    if (!newItem.trim() || !activeProjectId) return;
    const { data, error } = await (supabase as any).from("deliverables")
      .insert({
        project_id: activeProjectId,
        title: newItem.trim(),
        description: newDesc.trim() || null,
        category: newCategory || null,
        tags: newTags,
        sort_order: deliverables.filter((d) => d.project_id === activeProjectId).length,
      })
      .select().single();
    if (error) { toast.error(`Failed to add: ${error.message}`); return; }
    setDeliverables([...deliverables, data]);
    setNewItem(""); setNewDesc(""); setNewCategory(""); setNewTags([]);
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

  async function uploadDeliverableVideo(deliverableId: string, file: File) {
    setUploadingVideoFor(deliverableId);
    try {
      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `${deliverableId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("deliverable-videos").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from("deliverable-videos").getPublicUrl(path);
      const res = await fetch("/api/deliverables/record-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverableId, videoUrl: publicUrl }),
      });
      const text = await res.text();
      let resData: any = {};
      try { resData = JSON.parse(text); } catch { resData = { error: text || `Server error (${res.status})` }; }
      if (!res.ok) throw new Error(resData.error ?? "Failed to record video");
      toast.success("Video uploaded — client can now review it.");
    } catch (err: any) {
      toast.error(`Video upload failed: ${err.message ?? "unknown error"}`);
    } finally {
      setUploadingVideoFor(null);
    }
  }

  async function saveContentUrl(deliverableId: string) {
    const url = contentUrls[deliverableId] ?? "";
    await (supabase as any).from("deliverables").update({ content_url: url || null }).eq("id", deliverableId);
    toast.success("URL saved.");
  }

  /* ── Projects ── */
  async function createProject() {
    if (!newProjectName.trim()) { toast.error("Enter a project name."); return; }
    setCreatingProject(true);
    const { data, error } = await (supabase as any)
      .from("projects")
      .insert({ client_id: client.id, name: newProjectName.trim(), service_type: newProjectType, status: "active" })
      .select().single();
    setCreatingProject(false);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    setProjects([data, ...projects]);
    setActiveProjectId(data.id);
    setDeliverables([]); setCalEvents([]);
    setNewProjectName(""); setShowCreateProject(false);
    toast.success("Project created.");
  }

  /* ── Brief ── */
  async function saveBrief() {
    if (!activeProjectId) return;
    setSavingBrief(true);
    const { error } = await (supabase as any).from("projects").update({
      shoot_location: briefLocation.trim() || null,
      call_time: briefCallTime.trim() || null,
      access_notes: briefAccess.trim() || null,
      mood_board_url: briefMoodBoard.trim() || null,
      internal_brief: briefInternal.trim() || null,
    }).eq("id", activeProjectId);
    setSavingBrief(false);
    if (error) { toast.error(`Failed to save brief: ${error.message}`); return; }
    setProjects((prev) => prev.map((p) => p.id === activeProjectId ? {
      ...p,
      shoot_location: briefLocation.trim() || null,
      call_time: briefCallTime.trim() || null,
      access_notes: briefAccess.trim() || null,
      mood_board_url: briefMoodBoard.trim() || null,
      internal_brief: briefInternal.trim() || null,
    } : p));
    toast.success("Brief saved.");
  }

  /* ── Brand Voice ── */
  async function saveBrandVoice() {
    setSavingVoice(true);
    const { error } = await (supabase as any).from("brand_kits").upsert({
      client_id: client.id,
      voice_tone: voiceTone.trim() || null,
      voice_audience: voiceAudience.trim() || null,
      voice_messaging: voiceMessaging.trim() || null,
      voice_words_use: voiceWordsUse.trim() || null,
      voice_words_avoid: voiceWordsAvoid.trim() || null,
      voice_tagline: voiceTagline.trim() || null,
    }, { onConflict: "client_id" });
    setSavingVoice(false);
    if (error) { toast.error(`Failed to save brand voice: ${error.message}`); return; }
    toast.success("Brand voice saved.");
  }

  /* ── Meeting Logs ── */
  async function addMeetingLog() {
    if (!newMtgTitle.trim() || !newMtgDate) { toast.error("Title and date required."); return; }
    setSavingMtg(true);
    const { data, error } = await (supabase as any).from("meeting_logs").insert({
      client_id: client.id,
      project_id: activeProjectId || null,
      title: newMtgTitle.trim(),
      held_at: newMtgDate,
      meeting_type: newMtgType,
      attendees: newMtgAttendees.trim() || null,
      notes: newMtgNotes.trim() || null,
      content_planned: newMtgContent.trim() || null,
      action_items: newMtgActions.trim() || null,
    }).select().single();
    setSavingMtg(false);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    setMeetingLogs([data, ...meetingLogs]);
    setNewMtgTitle(""); setNewMtgDate(""); setNewMtgAttendees("");
    setNewMtgNotes(""); setNewMtgContent(""); setNewMtgActions("");
    setNewMtgType("creative_direction");
    toast.success("Meeting logged.");
  }

  async function saveMeetingLogEdit() {
    if (!editingMtg) return;
    const updates = {
      title: editingMtg.title,
      held_at: editingMtg.held_at,
      meeting_type: editingMtg.meeting_type,
      attendees: editingMtg.attendees || null,
      notes: editingMtg.notes || null,
      content_planned: editingMtg.content_planned || null,
      action_items: editingMtg.action_items || null,
    };
    const { error } = await (supabase as any).from("meeting_logs").update(updates).eq("id", editingMtg.id);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    setMeetingLogs(meetingLogs.map((m) => m.id === editingMtg.id ? { ...m, ...updates } : m));
    setEditingMtg(null);
    toast.success("Meeting updated.");
  }

  async function deleteMeetingLog(id: string) {
    setMeetingLogs(meetingLogs.filter((m) => m.id !== id));
    await (supabase as any).from("meeting_logs").delete().eq("id", id);
    toast.success("Removed.");
  }

  /* ── Analytics ── */
  async function addAnalytics() {
    if (!newAnalStart || !newAnalEnd) { toast.error("Period start and end required."); return; }
    setSavingAnal(true);
    const { data, error } = await (supabase as any).from("content_analytics").insert({
      client_id: client.id,
      period_start: newAnalStart,
      period_end: newAnalEnd,
      platform: analyticsTab,
      reach: newAnalReach ? parseInt(newAnalReach) : null,
      impressions: newAnalImpressions ? parseInt(newAnalImpressions) : null,
      engagement_rate: newAnalEngRate ? parseFloat(newAnalEngRate) : null,
      new_followers: newAnalNewFollowers ? parseInt(newAnalNewFollowers) : null,
      total_followers: newAnalTotalFollowers ? parseInt(newAnalTotalFollowers) : null,
      top_post_url: newAnalTopPost.trim() || null,
      notes: newAnalNotes.trim() || null,
    }).select().single();
    setSavingAnal(false);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    setAnalytics([data, ...analytics]);
    setNewAnalStart(""); setNewAnalEnd(""); setNewAnalReach(""); setNewAnalImpressions("");
    setNewAnalEngRate(""); setNewAnalNewFollowers(""); setNewAnalTotalFollowers("");
    setNewAnalTopPost(""); setNewAnalNotes("");
    toast.success("Analytics report saved.");
  }

  async function deleteAnalytics(id: string) {
    setAnalytics(analytics.filter((a) => a.id !== id));
    await (supabase as any).from("content_analytics").delete().eq("id", id);
    toast.success("Removed.");
  }

  /* ── Meta Business Suite ── */
  async function saveMeta() {
    setSavingMetaCreds(true);
    const { error } = await (supabase as any).from("profiles").update({
      meta_page_token: metaToken.trim() || null,
      meta_fb_page_id: metaFbPageId.trim() || null,
      meta_ig_account_id: metaIgId.trim() || null,
    }).eq("id", client.id);
    setSavingMetaCreds(false);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    toast.success("Meta credentials saved.");
    setShowMetaConfig(false);
  }

  async function connectSelectedPage() {
    if (!metaPages) return;
    const page = metaPages[selectedPageIdx];
    setSavingPagePick(true);
    const { error } = await (supabase as any).from("profiles").update({
      meta_page_token:      page.access_token,
      meta_fb_page_id:      page.id,
      meta_ig_account_id:   page.ig_account_id,
      meta_token_synced_at: null,
    }).eq("id", client.id);
    setSavingPagePick(false);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    setMetaToken(page.access_token);
    setMetaFbPageId(page.id);
    setMetaIgId(page.ig_account_id ?? "");
    setMetaPages(null);
    window.history.replaceState({}, "", `/admin/clients/${client.id}?tab=analytics`);
    toast.success(`"${page.name}" connected! Click Sync Meta to pull data.`);
  }

  async function syncMeta() {
    setSyncingMeta(true);
    try {
      const res = await fetch(`/api/admin/meta/insights/${client.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setMetaInsights(json);
      setMetaSyncedAt(new Date().toISOString());
      toast.success("Synced from Meta Business Suite.");
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncingMeta(false);
    }
  }

  async function syncTiktok() {
    setSyncingTiktok(true);
    try {
      const res = await fetch(`/api/admin/tiktok/insights/${client.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setTiktokInsights(json.tiktok);
      setTiktokSyncedAt(new Date().toISOString());
      toast.success("Synced from TikTok.");
    } catch (err: any) {
      toast.error(`TikTok sync failed: ${err.message}`);
    } finally {
      setSyncingTiktok(false);
    }
  }

  /* ── Invoices ── */
  async function addInvoice() {
    if (!newInvNumber.trim() || !newInvAmount) return;
    setCreatingInvoice(true);
    const lineItems = newInvLineItems
      .filter((li) => li.description.trim())
      .map((li) => ({
        description: li.description.trim(),
        quantity: li.quantity,
        unit_price: li.unit_price,
        total: li.quantity * li.unit_price,
      }));
    const { data, error } = await (supabase as any)
      .from("invoices")
      .insert({
        client_id: client.id,
        project_id: activeProjectId ?? null,
        invoice_number: newInvNumber.trim(),
        amount: parseFloat(newInvAmount),
        due_date: newInvDue || null,
        status: newInvStatus,
        // payment_type only sent when a non-standard type is selected (requires migration 027)
        ...(newInvPaymentType !== "standard" ? { payment_type: newInvPaymentType } : {}),
        line_items: lineItems,
        notes: newInvNotes.trim() || null,
      })
      .select()
      .single();
    setCreatingInvoice(false);
    if (error) { toast.error(`Failed to create invoice: ${error.message}`); return; }
    setInvoices([data, ...invoices]);
    setShowInvoiceForm(false);
    setNewInvNumber(""); setNewInvAmount(""); setNewInvDue(""); setNewInvNotes("");
    setNewInvStatus("pending"); setNewInvPaymentType("standard");
    setNewInvLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
    toast.success("Invoice created.");
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
      if (allOk) toast.success("Storage ready.");
      else toast.error("Some buckets failed. Check Supabase storage.");
    } catch { toast.dismiss(); toast.error("Setup failed."); }
  }

  /* ── Calendar ── */
  async function addCalEvent() {
    if (!newEvtTitle.trim() || !newEvtDate || !activeProjectId) return;
    setAddingEvt(true);
    const startISO = `${newEvtDate}T${newEvtTime || "09:00"}:00`;
    const { data, error } = await (supabase as any).from("calendar_events")
      .insert({ project_id: activeProjectId, title: newEvtTitle.trim(), start_date: startISO, type: newEvtType, color: EVENT_COLORS[newEvtType] })
      .select().single();
    if (error) { setAddingEvt(false); toast.error(`Failed: ${error.message}`); return; }

    const newEvents: any[] = [data];

    if (newEvtType === "shoot") {
      const shootBase = new Date(startISO);
      const editD = new Date(shootBase); editD.setDate(editD.getDate() + 3);
      const pubD  = new Date(shootBase); pubD.setDate(pubD.getDate() + 10);
      const { data: chain, error: chainErr } = await (supabase as any).from("calendar_events")
        .insert([
          { project_id: activeProjectId, title: "Edit",    start_date: `${editD.toISOString().split("T")[0]}T09:00:00`, type: "edit",    color: EVENT_COLORS["edit"] },
          { project_id: activeProjectId, title: "Publish", start_date: `${pubD.toISOString().split("T")[0]}T09:00:00`,  type: "publish", color: EVENT_COLORS["publish"] },
        ]).select();
      if (!chainErr && chain) newEvents.push(...chain);
      toast.success(`Shoot added · edit ${editD.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · publish ${pubD.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}.`);

      // Auto-schedule Monthly Reports for retainer projects (first shoot only)
      const isRetainer = activeProject?.service_type === "retainer";
      const existingShootCount = calEvents.filter((e: any) => e.type === "shoot").length;
      if (isRetainer && existingShootCount === 0) {
        const reportEventsToInsert: any[] = [];
        for (let n = 0; n < 13; n++) {
          const reportDate = new Date(shootBase);
          reportDate.setDate(reportDate.getDate() + 42 + n * 28); // 6 weeks + (n × 4 weeks)
          reportEventsToInsert.push({
            project_id: activeProjectId,
            title: "Monthly Report",
            start_date: `${reportDate.toISOString().split("T")[0]}T09:00:00`,
            type: "report",
            color: "#9c847a",
          });
        }
        const { data: reportEvtRows } = await (supabase as any).from("calendar_events").insert(reportEventsToInsert).select();
        if (reportEvtRows) {
          newEvents.push(...reportEvtRows);
          // Create corresponding monthly_reports tracking rows
          const reportTrackingRows = reportEvtRows.map((evt: any, n: number) => {
            const periodEnd = new Date(shootBase); periodEnd.setDate(periodEnd.getDate() + 42 + n * 28);
            const periodStart = new Date(periodEnd); periodStart.setDate(periodStart.getDate() - 28);
            return {
              client_id: client.id,
              project_id: activeProjectId,
              calendar_event_id: evt.id,
              report_period_start: periodStart.toISOString().split("T")[0],
              report_period_end: periodEnd.toISOString().split("T")[0],
              status: "pending",
            };
          });
          await (supabase as any).from("monthly_reports").insert(reportTrackingRows);
          toast.success(`Monthly Report schedule created — 12 reports starting ${reportEventsToInsert[0].start_date.split("T")[0]}.`);
        }
      }
    } else if (newEvtType === "meeting") {
      const { data: mtgLog } = await (supabase as any).from("meeting_logs").insert({
        client_id: client.id,
        project_id: activeProjectId,
        calendar_event_id: data.id,
        title: newEvtTitle.trim(),
        held_at: newEvtDate,
        meeting_type: newEvtMtgType || "creative_direction",
        attendees: newEvtAttendees.trim() || null,
      }).select().single();
      if (mtgLog) setMeetingLogs([mtgLog, ...meetingLogs]);
      toast.success("Meeting scheduled + log created — fill in notes in the Meetings tab.");
    } else {
      toast.success("Event added.");
    }

    setAddingEvt(false);
    setCalEvents([...calEvents, ...newEvents].sort((a: any, b: any) => a.start_date.localeCompare(b.start_date)));
    setNewEvtTitle(""); setNewEvtDate(""); setNewEvtAttendees("");
  }

  function openEditEvt(evt: any) {
    setEditingEvt(evt);
    setEditTitle(evt.title ?? "");
    const sd = evt.start_date ?? "";
    setEditDate(sd.split("T")[0]);
    setEditTime(sd.includes("T") ? sd.split("T")[1].slice(0, 5) : "09:00");
    setEditType(evt.type ?? "meeting");
    setEditNotes(evt.notes ?? "");
  }

  async function updateCalEvent() {
    if (!editingEvt || !editTitle.trim() || !editDate) return;
    setSavingEvt(true);
    const startISO = `${editDate}T${editTime || "09:00"}:00`;
    const updates = { title: editTitle.trim(), start_date: startISO, type: editType, notes: editNotes.trim() || null, color: EVENT_COLORS[editType] };
    const { error } = await (supabase as any).from("calendar_events").update(updates).eq("id", editingEvt.id);
    setSavingEvt(false);
    if (error) { toast.error("Failed to update."); return; }
    setCalEvents(
      calEvents.map((e: any) => e.id === editingEvt.id ? { ...e, ...updates } : e)
        .sort((a: any, b: any) => a.start_date.localeCompare(b.start_date))
    );
    setEditingEvt(null);
    toast.success("Event updated.");
  }

  async function deleteCalEvent(id: string) {
    setCalEvents(calEvents.filter((e: any) => e.id !== id));
    await (supabase as any).from("calendar_events").delete().eq("id", id);
    toast.success("Event removed.");
  }

  /* ── Onboarding ── */
  const onboardingSteps = [
    { label: "Logo uploaded",         done: !!brandKit?.logo_url },
    { label: "Brand colours set",     done: Array.isArray(brandKit?.colors) && brandKit.colors.length > 0 },
    { label: "Brand fonts chosen",    done: Array.isArray(brandKit?.fonts) && brandKit.fonts.length > 0 },
    { label: "Brand assets uploaded", done: clientAssets.length > 0 },
    { label: "Brand voice defined",   done: !!(brandKit?.voice_tone) },
    { label: "Proposal sent",         done: proposals.some((p: any) => p.status !== "draft") },
    { label: "Proposal accepted",     done: proposals.some((p: any) => p.status === "accepted") },
  ];
  const onboardingDone = onboardingSteps.filter((s) => s.done).length;

  return (
    <div>
      {/* Meta page picker modal — shown after OAuth when admin manages multiple pages */}
      {metaPages && metaPages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
              Which page is {client.full_name}?
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              We found multiple Facebook Pages on your account. Select the one that belongs to this client.
            </p>
            <div className="space-y-2 mb-5">
              {metaPages.map((page, i) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPageIdx(i)}
                  className="w-full text-left rounded-xl px-4 py-3"
                  style={{
                    background: selectedPageIdx === i ? "rgba(156,132,122,0.12)" : "var(--secondary)",
                    border: selectedPageIdx === i ? "1px solid var(--ll-taupe)" : "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{page.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)" }}>
                    Page ID: {page.id}
                    {page.ig_account_id ? " · Instagram linked" : " · No Instagram linked"}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={connectSelectedPage}
                disabled={savingPagePick}
                className="flex-1 text-sm font-semibold py-2.5 rounded-xl"
                style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                {savingPagePick ? "Connecting…" : "Connect this page"}
              </button>
              <button
                onClick={() => {
                  setMetaPages(null);
                  window.history.replaceState({}, "", `/admin/clients/${client.id}?tab=analytics`);
                }}
                className="px-4 text-sm font-semibold py-2.5 rounded-xl"
                style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete client confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(""); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="rounded-2xl p-7 w-full max-w-sm shadow-2xl pointer-events-auto"
                style={{ background: "var(--card)", border: "1px solid rgba(229,62,62,0.25)" }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <AlertTriangle size={17} style={{ color: "#c53030" }} />
                  <h3 className="text-base font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>Delete client</h3>
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  This permanently deletes <strong>{client.full_name}</strong> and all their data. Type their name to confirm.
                </p>
                <input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={client.full_name}
                  className="w-full px-3 py-2 rounded-xl text-sm mb-4"
                  style={{ border: "1px solid rgba(229,62,62,0.4)", background: "rgba(229,62,62,0.04)", color: "var(--foreground)", fontFamily: "var(--font-body)", outline: "none" }}
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(""); }}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                    Cancel
                  </button>
                  <button
                    onClick={deleteClient}
                    disabled={deleteConfirmName.trim() !== client.full_name || deleting}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold"
                    style={{
                      background: deleteConfirmName.trim() === client.full_name ? "#c53030" : "var(--secondary)",
                      color: deleteConfirmName.trim() === client.full_name ? "#fff" : "var(--ll-neutral)",
                      fontFamily: "var(--font-body)",
                      cursor: deleteConfirmName.trim() === client.full_name ? "pointer" : "not-allowed",
                    }}>
                    {deleting ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Project context bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {projects.length > 0 ? (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProjectId(p.id);
                  loadDeliverablesForProject(p.id);
                  setBriefLocation(p.shoot_location ?? "");
                  setBriefCallTime(p.call_time ?? "");
                  setBriefAccess(p.access_notes ?? "");
                  setBriefMoodBoard(p.mood_board_url ?? "");
                  setBriefInternal(p.internal_brief ?? "");
                }}
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateProject((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Plus size={12} /> New project
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(229,62,62,0.06)", color: "#c53030", border: "1px solid rgba(229,62,62,0.2)", fontFamily: "var(--font-body)" }}
          >
            <Trash2 size={12} /> Delete client
          </button>
        </div>
      </div>

      {/* Create project form */}
      <AnimatePresence>
        {showCreateProject && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Create project</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createProject()} style={inputStyle} />
                <select value={newProjectType} onChange={(e) => setNewProjectType(e.target.value)} style={inputStyle}>
                  <option value="retainer">Retainer</option>
                  <option value="photography">Photography</option>
                  <option value="videography">Videography</option>
                  <option value="content_strategy">Content Strategy</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createProject} disabled={creatingProject} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                  {creatingProject ? "Creating…" : "Create"}
                </button>
                <button onClick={() => setShowCreateProject(false)} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
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

        {/* ── TIMELINE ── */}
        {tab === "timeline" && (
          <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!activeProjectId && <p className="text-sm mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No active project selected.</p>}
            <div className="space-y-2 mb-4">
              {deliverables.map((d) => (
                <div key={d.id} className={rowBase} style={rowStyle}>
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{d.title}</p>
                      {d.category && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                          {d.category.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {d.description && <p className="text-xs truncate mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{d.description}</p>}
                    {d.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {d.tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <button onClick={() => toggleAgencyApproval(d)} className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: d.agency_approved ? "rgba(156,132,122,0.15)" : "var(--secondary)", color: d.agency_approved ? "var(--ll-taupe)" : "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                      {d.agency_approved ? "L&L ✓" : "Mark done"}
                    </button>
                    <span className="text-xs" style={{ color: d.client_approved ? "var(--ll-taupe)" : "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Client: {d.client_approved ? "✓" : "pending"}</span>
                    {d.category !== "video" && d.category !== "short_form_reel" ? (
                      <input
                        value={contentUrls[d.id] ?? ""}
                        onChange={(e) => setContentUrls({ ...contentUrls, [d.id]: e.target.value })}
                        onBlur={() => saveContentUrl(d.id)}
                        placeholder="Paste URL…"
                        className="text-xs px-2 py-1 rounded-lg outline-none"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)", width: 150 }}
                      />
                    ) : (
                      <label className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg cursor-pointer" style={{ background: "var(--secondary)", color: uploadingVideoFor === d.id ? "var(--ll-grey)" : "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }} title="Upload review video">
                        <Video size={12} />
                        {uploadingVideoFor === d.id ? "…" : "Video"}
                        <input type="file" accept="video/*" className="hidden" disabled={uploadingVideoFor === d.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDeliverableVideo(d.id, f); e.target.value = ""; }} />
                      </label>
                    )}
                    <button onClick={() => deleteDeliverable(d.id)} style={{ color: "#c53030" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            {activeProjectId && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDeliverable()} placeholder="Deliverable title…" className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)" }} />
                  <button onClick={addDeliverable} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>Add</button>
                </div>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)" }} />
                <div className="flex items-center gap-3 flex-wrap">
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">Category (optional)</option>
                    <option value="carousel">Carousel</option>
                    <option value="static_post">Static Post</option>
                    <option value="infographic">Infographic</option>
                    <option value="video">Video</option>
                    <option value="short_form_reel">Short Form Reel</option>
                  </select>
                  <div className="flex items-center gap-3">
                    {(["vertical", "horizontal"] as const).map((tag) => (
                      <label key={tag} className="flex items-center gap-1.5 text-xs cursor-pointer capitalize" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        <input type="checkbox" checked={newTags.includes(tag)} onChange={() => toggleNewTag(tag)} style={{ accentColor: "var(--ll-taupe)" }} />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── INVOICES ── */}
        {tab === "invoices" && (
          <motion.div key="invoices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Add invoice button */}
            <div className="mb-4">
              <button onClick={() => setShowInvoiceForm((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
                style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                <Plus size={12} /> {showInvoiceForm ? "Cancel" : "Add Invoice"}
              </button>
            </div>

            {/* Invoice creation form */}
            <AnimatePresence>
              {showInvoiceForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>New Invoice</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Invoice #</label>
                        <input value={newInvNumber} onChange={(e) => setNewInvNumber(e.target.value)} placeholder="INV-001" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Amount ($)</label>
                        <input type="number" min="0" step="0.01" value={newInvAmount} onChange={(e) => setNewInvAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Due Date</label>
                        <input type="date" value={newInvDue} onChange={(e) => setNewInvDue(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Status</label>
                        <select value={newInvStatus} onChange={(e) => setNewInvStatus(e.target.value as any)} style={inputStyle}>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Payment type</label>
                        <select value={newInvPaymentType} onChange={(e) => setNewInvPaymentType(e.target.value as any)} style={inputStyle}>
                          <option value="standard">Standard</option>
                          <option value="deposit">Booking Deposit (50%)</option>
                          <option value="balance">Balance on Delivery (50%)</option>
                        </select>
                      </div>
                    </div>

                    {/* Line items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Line items</label>
                        <button type="button" onClick={() => setNewInvLineItems([...newInvLineItems, { description: "", quantity: 1, unit_price: 0 }])}
                          className="text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                          + Add row
                        </button>
                      </div>
                      {newInvLineItems.map((li, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                          <input className="col-span-6" value={li.description} onChange={(e) => setNewInvLineItems(newInvLineItems.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" style={inputStyle} />
                          <input className="col-span-2" type="number" min="1" value={li.quantity} onChange={(e) => setNewInvLineItems(newInvLineItems.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} placeholder="Qty" style={inputStyle} />
                          <input className="col-span-3" type="number" min="0" step="0.01" value={li.unit_price || ""} onChange={(e) => setNewInvLineItems(newInvLineItems.map((x, j) => j === i ? { ...x, unit_price: Number(e.target.value) } : x))} placeholder="Unit $" style={inputStyle} />
                          <button type="button" onClick={() => setNewInvLineItems(newInvLineItems.filter((_, j) => j !== i))} className="col-span-1 flex items-center justify-center" style={{ color: "var(--ll-grey)" }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Notes (optional)</label>
                      <textarea value={newInvNotes} onChange={(e) => setNewInvNotes(e.target.value)} rows={2} placeholder="Payment instructions, terms…" style={taStyle} />
                    </div>

                    <button onClick={addInvoice} disabled={creatingInvoice || !newInvNumber.trim() || !newInvAmount}
                      className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
                      style={{ background: "var(--ll-taupe)", color: "#fff", fontFamily: "var(--font-body)", opacity: creatingInvoice || !newInvNumber.trim() || !newInvAmount ? 0.5 : 1 }}>
                      {creatingInvoice ? "Creating…" : "Create Invoice"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invoice list */}
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className={rowBase} style={rowStyle}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{inv.invoice_number}</span>
                    {inv.due_date && (
                      <span className="text-xs ml-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        Due {new Date(inv.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {(inv as any).notes && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{(inv as any).notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>${inv.amount.toFixed(2)}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: statusBg(inv.status), color: statusText(inv.status) }}>{inv.status}</span>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No invoices yet.</p>}
            </div>
          </motion.div>
        )}

        {/* ── CALENDAR ── */}
        {tab === "calendar" && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {activeProjectId && (
              <div className="rounded-2xl p-5 mb-6 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Add calendar event</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input placeholder="Event title" value={newEvtTitle} onChange={(e) => setNewEvtTitle(e.target.value)} style={inputStyle} />
                  <input type="date" value={newEvtDate} onChange={(e) => setNewEvtDate(e.target.value)} style={inputStyle} />
                  <input type="time" value={newEvtTime} onChange={(e) => setNewEvtTime(e.target.value)} style={inputStyle} />
                  <select value={newEvtType} onChange={(e) => setNewEvtType(e.target.value)} style={inputStyle}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                {newEvtType === "meeting" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="Attendees (e.g. Kade, Sarah, client name)" value={newEvtAttendees} onChange={(e) => setNewEvtAttendees(e.target.value)} style={inputStyle} />
                    <select value={newEvtMtgType} onChange={(e) => setNewEvtMtgType(e.target.value)} style={inputStyle}>
                      {MEETING_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={addCalEvent} disabled={addingEvt} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                  <Plus size={14} /> Add event
                </button>
              </div>
            )}
            <AnimatePresence>
              {editingEvt && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Edit event</p>
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
                  <textarea placeholder="Notes (optional)" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} style={taStyle} />
                  <div className="flex gap-2">
                    <button onClick={updateCalEvent} disabled={savingEvt} className="text-sm font-semibold px-4 py-2 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                      {savingEvt ? "Saving…" : "Save changes"}
                    </button>
                    <button onClick={() => setEditingEvt(null)} className="text-sm px-4 py-2 rounded-xl" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-2">
              {calEvents.map((evt: any) => (
                <div key={evt.id} className={rowBase} style={rowStyle}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: evt.color ?? EVENT_COLORS[evt.type] ?? "#9c847a" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{evt.title}</p>
                      <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        {new Date(evt.start_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        {evt.start_date?.includes("T") && ` · ${new Date(evt.start_date).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })}`}
                        {` · ${evt.type}`}
                        {evt.notes && <span> · {evt.notes}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditEvt(evt)} style={{ color: "var(--ll-taupe)" }}><Pencil size={14} /></button>
                    <button onClick={() => deleteCalEvent(evt.id)} style={{ color: "#c53030" }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {calEvents.length === 0 && <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No calendar events yet.</p>}
            </div>
          </motion.div>
        )}

        {/* ── BRIEF ── */}
        {tab === "brief" && (
          <motion.div key="brief" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!activeProjectId ? (
              <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No active project selected.</p>
            ) : (
              <div className="space-y-4 max-w-xl">
                <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  Visible to team members assigned to this project. Fill in details they need to show up prepared.
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Shoot location", value: briefLocation, set: setBriefLocation, placeholder: "e.g. 12 Beach Rd, Byron Bay NSW 2481" },
                    { label: "Call time", value: briefCallTime, set: setBriefCallTime, placeholder: "e.g. 7:30am on-site" },
                    { label: "Mood board / reference URL", value: briefMoodBoard, set: setBriefMoodBoard, placeholder: "https://…" },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{label}</label>
                      <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Access &amp; parking notes</label>
                    <textarea value={briefAccess} onChange={(e) => setBriefAccess(e.target.value)} placeholder="e.g. Enter via side gate, code 4421. Street parking only." rows={2} style={taStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Internal brief</label>
                    <textarea value={briefInternal} onChange={(e) => setBriefInternal(e.target.value)} placeholder="Creative direction, shoot goals, tone, equipment, client expectations…" rows={5} style={taStyle} />
                  </div>
                </div>
                <button onClick={saveBrief} disabled={savingBrief} className="text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                  {savingBrief ? "Saving…" : "Save brief"}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── MEETINGS ── */}
        {tab === "meetings" && (
          <motion.div key="meetings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl p-5 mb-6 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Log a meeting</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input placeholder="Meeting title" value={newMtgTitle} onChange={(e) => setNewMtgTitle(e.target.value)} style={inputStyle} />
                <input type="date" value={newMtgDate} onChange={(e) => setNewMtgDate(e.target.value)} style={inputStyle} />
                <select value={newMtgType} onChange={(e) => setNewMtgType(e.target.value)} style={inputStyle}>
                  {MEETING_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                </select>
              </div>
              <input placeholder="Attendees (e.g. Kade, Sarah, client name)" value={newMtgAttendees} onChange={(e) => setNewMtgAttendees(e.target.value)} style={inputStyle} />
              <textarea placeholder="Meeting notes / minutes" value={newMtgNotes} onChange={(e) => setNewMtgNotes(e.target.value)} rows={3} style={taStyle} />
              <textarea placeholder="Content planned — what are we making? (platforms, formats, ideas discussed)" value={newMtgContent} onChange={(e) => setNewMtgContent(e.target.value)} rows={3} style={taStyle} />
              <textarea placeholder="Action items" value={newMtgActions} onChange={(e) => setNewMtgActions(e.target.value)} rows={2} style={taStyle} />
              <button onClick={addMeetingLog} disabled={savingMtg} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                <Plus size={14} /> {savingMtg ? "Saving…" : "Log meeting"}
              </button>
            </div>

            <div className="space-y-3">
              {meetingLogs.map((m: any) => (
                <div key={m.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="w-full flex items-start justify-between p-4 cursor-pointer" onClick={() => setExpandedMtg(expandedMtg === m.id ? null : m.id)}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{m.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                          {m.meeting_type.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                        {new Date(m.held_at).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                        {m.attendees && ` · ${m.attendees}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <button onClick={(e) => { e.stopPropagation(); setEditingMtg({ ...m }); }} style={{ color: "var(--ll-taupe)" }}><Pencil size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteMeetingLog(m.id); }} style={{ color: "#c53030" }}><Trash2 size={14} /></button>
                      {expandedMtg === m.id ? <ChevronUp size={14} style={{ color: "var(--ll-grey)" }} /> : <ChevronDown size={14} style={{ color: "var(--ll-grey)" }} />}
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {expandedMtg === m.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                          {m.notes && (
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>Notes</p>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{m.notes}</p>
                            </div>
                          )}
                          {m.content_planned && (
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>Content planned</p>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{m.content_planned}</p>
                            </div>
                          )}
                          {m.action_items && (
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>Action items</p>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{m.action_items}</p>
                            </div>
                          )}
                          {!m.notes && !m.content_planned && !m.action_items && (
                            <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No notes recorded yet.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {meetingLogs.length === 0 && (
                <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No meetings logged yet. Schedule a meeting in the Calendar tab to auto-create a log entry.</p>
                </div>
              )}
            </div>

            {/* Edit meeting modal */}
            <AnimatePresence>
              {editingMtg && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setEditingMtg(null)}>
                  <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto" style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>Edit meeting</p>
                      <button onClick={() => setEditingMtg(null)} style={{ color: "var(--ll-grey)" }}><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={editingMtg.title} onChange={(e) => setEditingMtg({ ...editingMtg, title: e.target.value })} placeholder="Title" style={inputStyle} />
                      <input type="date" value={editingMtg.held_at} onChange={(e) => setEditingMtg({ ...editingMtg, held_at: e.target.value })} style={inputStyle} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select value={editingMtg.meeting_type} onChange={(e) => setEditingMtg({ ...editingMtg, meeting_type: e.target.value })} style={inputStyle}>
                        {MEETING_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                      </select>
                      <input value={editingMtg.attendees ?? ""} onChange={(e) => setEditingMtg({ ...editingMtg, attendees: e.target.value })} placeholder="Attendees" style={inputStyle} />
                    </div>
                    <textarea value={editingMtg.notes ?? ""} onChange={(e) => setEditingMtg({ ...editingMtg, notes: e.target.value })} placeholder="Meeting notes" rows={3} style={taStyle} />
                    <textarea value={editingMtg.content_planned ?? ""} onChange={(e) => setEditingMtg({ ...editingMtg, content_planned: e.target.value })} placeholder="Content planned" rows={3} style={taStyle} />
                    <textarea value={editingMtg.action_items ?? ""} onChange={(e) => setEditingMtg({ ...editingMtg, action_items: e.target.value })} placeholder="Action items" rows={2} style={taStyle} />
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveMeetingLogEdit} className="text-sm font-semibold px-4 py-2 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>Save</button>
                      <button onClick={() => setEditingMtg(null)} className="text-sm px-4 py-2 rounded-xl" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>Cancel</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Client access toggle */}
            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={toggleAnalyticsAccess}
                disabled={togglingAnalytics}
                className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                style={{ background: analyticsEnabled ? "var(--ll-taupe)" : "var(--ll-neutral, #d9d9d9)" }}
              >
                <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow block transition-transform"
                  style={{ transform: analyticsEnabled ? "translateX(18px)" : "translateX(2px)" }} />
              </button>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  Client analytics access: <span style={{ color: analyticsEnabled ? "var(--ll-taupe)" : "var(--ll-grey)" }}>{analyticsEnabled ? "ON" : "OFF"}</span>
                </p>
                <p className="text-[11px]" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {analyticsEnabled ? "Client can see their analytics dashboard." : "Analytics is hidden from the client (paid feature)."}
                </p>
              </div>
            </div>

            {/* Platform tabs + action bar */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex gap-2">
                {PLATFORMS.map((pl) => (
                  <button key={pl.value} onClick={() => setAnalyticsTab(pl.value as any)} className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: analyticsTab === pl.value ? pl.color : "var(--secondary)", color: analyticsTab === pl.value ? "#fff" : "var(--ll-grey)", border: analyticsTab === pl.value ? "none" : "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                    {pl.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {(analyticsTab === "instagram" || analyticsTab === "facebook") && (
                  <button onClick={syncMeta} disabled={syncingMeta}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
                    style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                    <RefreshCw size={13} style={{ animation: syncingMeta ? "spin 1s linear infinite" : "none" }} />
                    {syncingMeta ? "Syncing…" : "Sync Meta"}
                  </button>
                )}
                {analyticsTab === "tiktok" && tiktokIsConnected && (
                  <button onClick={syncTiktok} disabled={syncingTiktok}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
                    style={{ background: "var(--secondary)", color: "#010101", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                    <RefreshCw size={13} style={{ animation: syncingTiktok ? "spin 1s linear infinite" : "none" }} />
                    {syncingTiktok ? "Syncing…" : "Sync TikTok"}
                  </button>
                )}
                {(analyticsTab === "instagram" || analyticsTab === "facebook") && (
                  <button onClick={() => setShowMetaConfig((v) => !v)}
                    className="p-2 rounded-xl"
                    style={{ background: showMetaConfig ? "var(--ll-taupe)" : "var(--secondary)", color: showMetaConfig ? "#fff" : "var(--ll-grey)", border: "1px solid var(--border)" }}
                    title="Configure Meta credentials">
                    <Settings size={14} />
                  </button>
                )}
                {analyticsTab === "tiktok" && (
                  <button onClick={() => setShowTiktokConfig((v) => !v)}
                    className="p-2 rounded-xl"
                    style={{ background: showTiktokConfig ? "#010101" : "var(--secondary)", color: showTiktokConfig ? "#fff" : "var(--ll-grey)", border: "1px solid var(--border)" }}
                    title="Configure TikTok connection">
                    <Settings size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Meta config panel */}
            <AnimatePresence>
              {showMetaConfig && analyticsTab !== "tiktok" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Connect Meta Business Suite</p>

                    {/* OAuth button — primary path */}
                    <a
                      href={`/api/admin/meta/connect?clientId=${client.id}`}
                      className="flex items-center justify-center gap-2 w-full text-sm font-semibold py-3 rounded-xl"
                      style={{ background: "#1877F2", color: "#fff", fontFamily: "var(--font-body)", textDecoration: "none" }}
                    >
                      Connect via Facebook Login →
                    </a>
                    <p className="text-xs text-center" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      You&apos;ll log in to Facebook and choose which Page to connect. Takes about 30 seconds.
                    </p>
                    {/* Localhost warning */}
                    {typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && (
                      <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(229,62,62,0.06)", border: "1px solid rgba(229,62,62,0.2)", color: "#c53030", fontFamily: "var(--font-body)" }}>
                        <strong>Localhost detected:</strong> Facebook OAuth requires a registered redirect URL. This button won&apos;t work locally — deploy to production first, then add <code style={{ fontFamily: "monospace", background: "rgba(229,62,62,0.08)", padding: "0 3px", borderRadius: 3 }}>https://your-domain/api/admin/meta/callback</code> as an allowed OAuth redirect in your Facebook App dashboard.
                      </div>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                      <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>or paste manually</span>
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>

                    {/* Manual fallback */}
                    <div>
                      <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Page Access Token</label>
                      <input type="password" value={metaToken} onChange={(e) => setMetaToken(e.target.value)} placeholder="EAAxxxx…" style={inputStyle} autoComplete="off" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Facebook Page ID</label>
                        <input value={metaFbPageId} onChange={(e) => setMetaFbPageId(e.target.value)} placeholder="123456789" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Instagram Business Account ID</label>
                        <input value={metaIgId} onChange={(e) => setMetaIgId(e.target.value)} placeholder="17841400…" style={inputStyle} />
                      </div>
                    </div>
                    <button onClick={saveMeta} disabled={savingMetaCreds}
                      className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
                      style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                      {savingMetaCreds ? "Saving…" : "Save manually"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TikTok config panel */}
            <AnimatePresence>
              {showTiktokConfig && analyticsTab === "tiktok" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "var(--card)", border: "1px solid #010101" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Connect TikTok Business Account</p>
                    <a
                      href={`/api/admin/tiktok/connect?clientId=${client.id}`}
                      className="flex items-center justify-center gap-2 w-full text-sm font-semibold py-3 rounded-xl"
                      style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)", textDecoration: "none" }}
                    >
                      Connect via TikTok Login →
                    </a>
                    <p className="text-xs text-center" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      The TikTok account owner will log in and grant access. Takes about 30 seconds.
                    </p>
                    {tiktokIsConnected && (
                      <p className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: "#276749", fontFamily: "var(--font-body)" }}>
                        <Wifi size={11} /> Already connected — reconnect to refresh permissions.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sync status lines */}
            {(analyticsTab === "instagram" || analyticsTab === "facebook") && !showMetaConfig && metaSyncedAt && (
              <p className="text-xs mb-5 flex items-center gap-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                <Wifi size={11} style={{ color: "#276749" }} />
                Last synced: {new Date(metaSyncedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {(analyticsTab === "instagram" || analyticsTab === "facebook") && !showMetaConfig && !metaSyncedAt && (
              <p className="text-xs mb-5 flex items-center gap-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                <WifiOff size={11} /> Not connected — click <Settings size={10} className="inline" /> to add credentials, then Sync Meta.
              </p>
            )}
            {analyticsTab === "tiktok" && !showTiktokConfig && tiktokIsConnected && tiktokSyncedAt && (
              <p className="text-xs mb-5 flex items-center gap-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                <Wifi size={11} style={{ color: "#276749" }} />
                Last synced: {new Date(tiktokSyncedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {analyticsTab === "tiktok" && !showTiktokConfig && tiktokIsConnected && !tiktokSyncedAt && (
              <p className="text-xs mb-5 flex items-center gap-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                <WifiOff size={11} /> Connected — click Sync TikTok to pull data.
              </p>
            )}
            {analyticsTab === "tiktok" && !showTiktokConfig && !tiktokIsConnected && (
              <p className="text-xs mb-5 flex items-center gap-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                <WifiOff size={11} /> Not connected — click <Settings size={10} className="inline" /> to connect TikTok.
              </p>
            )}

            {/* KPI cards */}
            {analyticsTab === "all" ? (() => {
              // Combined "All Platforms" view — aggregate latest data across all platforms
              const fmt = (v: number | null) => {
                if (v == null) return "—";
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
                return v.toLocaleString("en-AU");
              };
              const platforms = ["instagram", "facebook", "tiktok"] as const;
              const perPlatform = platforms.map((pl) => {
                const live = pl === "tiktok" ? tiktokInsights : metaInsights?.[pl];
                const saved = analytics.filter((a: any) => a.platform === pl)[0];
                return {
                  label: pl.charAt(0).toUpperCase() + pl.slice(1),
                  color: pl === "instagram" ? "#E1306C" : pl === "facebook" ? "#1877F2" : "#010101",
                  reach: live?.reach ?? saved?.reach ?? null,
                  impressions: live?.impressions ?? saved?.impressions ?? null,
                  followers: live?.total_followers ?? saved?.total_followers ?? null,
                  engagement: saved?.engagement_rate ?? live?.engagement_rate ?? null,
                };
              });
              const sumOrNull = (vals: (number | null)[]) => {
                const nums = vals.filter((v): v is number => v != null);
                return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
              };
              const avgOrNull = (vals: (number | null)[]) => {
                const nums = vals.filter((v): v is number => v != null);
                return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : null;
              };
              const totalReach = sumOrNull(perPlatform.map((p) => p.reach));
              const totalImpressions = sumOrNull(perPlatform.map((p) => p.impressions));
              const totalFollowers = sumOrNull(perPlatform.map((p) => p.followers));
              const avgEngagement = avgOrNull(perPlatform.map((p) => p.engagement));
              return (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Total Reach",        val: fmt(totalReach),       color: "#9c847a" },
                      { label: "Total Impressions",  val: fmt(totalImpressions), color: "#aba696" },
                      { label: "Total Followers",    val: fmt(totalFollowers),   color: "#c2ba9b" },
                      { label: "Avg Engagement",     val: avgEngagement != null ? `${avgEngagement}%` : "—", color: "#696348" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}>{label}</p>
                        <p className="font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "clamp(1.6rem,4vw,2rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                    <div className="px-5 py-3" style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Platform Breakdown</p>
                    </div>
                    {perPlatform.map((pl) => (
                      <div key={pl.label} className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: pl.color }} />
                          <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{pl.label}</p>
                        </div>
                        <div className="flex gap-6 text-right">
                          <div><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Reach</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(pl.reach)}</p></div>
                          <div><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Impressions</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(pl.impressions)}</p></div>
                          <div><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Followers</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{fmt(pl.followers)}</p></div>
                          <div><p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Engagement</p><p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{pl.engagement != null ? `${pl.engagement}%` : "—"}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })() : (() => {
              const liveData = analyticsTab === "tiktok" ? tiktokInsights : metaInsights?.[analyticsTab];
              const savedReports = analytics.filter((a: any) => a.platform === analyticsTab);
              const latest = savedReports[0];
              const prev = savedReports[1];

              const reach          = liveData?.reach          ?? latest?.reach          ?? null;
              const impressions    = liveData?.impressions    ?? latest?.impressions    ?? null;
              const totalFollowers = liveData?.total_followers ?? latest?.total_followers ?? null;
              const engagementRate = latest?.engagement_rate  ?? null;
              const prevReach      = liveData?.prev_reach     ?? prev?.reach            ?? null;
              const prevImpressions = liveData?.prev_impressions ?? prev?.impressions   ?? null;
              const prevFollowers  = prev?.total_followers    ?? null;

              const fmt = (v: number | null) => {
                if (v == null) return "—";
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
                return v.toLocaleString("en-AU");
              };
              const delta = (curr: number | null, prv: number | null) => {
                if (curr == null || prv == null || prv === 0) return null;
                const pct = ((curr - prv) / Math.abs(prv)) * 100;
                return { pct: Math.abs(pct).toFixed(1), up: pct >= 0 };
              };
              const sparkData = (field: string) => {
                const vals = [...savedReports].reverse().slice(-7).map((r: any) => Number(r[field]) || 0);
                const max = Math.max(...vals, 1);
                return vals.map((v) => v / max);
              };

              const kpis = [
                { label: "Reach",          val: reach,          pv: prevReach,       disp: fmt(reach),          spark: sparkData("reach"),          color: "#9c847a" },
                { label: "Impressions",    val: impressions,    pv: prevImpressions, disp: fmt(impressions),    spark: sparkData("impressions"),    color: "#aba696" },
                { label: "Followers",      val: totalFollowers, pv: prevFollowers,   disp: fmt(totalFollowers), spark: sparkData("total_followers"), color: "#c2ba9b" },
                { label: "Engagement Rate",val: engagementRate, pv: null,            disp: engagementRate != null ? `${engagementRate}%` : "—", spark: sparkData("engagement_rate"), color: "#696348" },
              ];

              return (
                <>
                  {liveData?.error && (
                    <div className="rounded-xl px-4 py-3 mb-5 text-xs" style={{ background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.2)", color: "#c53030", fontFamily: "var(--font-body)" }}>
                      Sync error: {liveData.error}
                    </div>
                  )}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {kpis.map(({ label, val, pv, disp, spark, color }) => {
                      const d = delta(val, pv);
                      return (
                        <div key={label} className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}>{label}</p>
                          <p className="font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "clamp(1.6rem,4vw,2rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>{disp}</p>
                          {d ? (
                            <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: d.up ? "#276749" : "#c53030", fontFamily: "var(--font-body)" }}>
                              {d.up ? "▲" : "▼"} {d.pct}% vs prior
                            </p>
                          ) : (
                            <p className="text-xs mt-1" style={{ color: "transparent", fontFamily: "var(--font-body)" }}>—</p>
                          )}
                          <div className="flex items-end gap-0.5 mt-3" style={{ height: 28 }}>
                            {(spark.length > 0 ? spark : Array(7).fill(0.35)).map((h: number, i: number, arr: number[]) => (
                              <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(h, 0.08) * 100}%`, background: i === arr.length - 1 ? color : `${color}55` }} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Trend bar chart from saved reports */}
            {(() => {
              const savedReports = analytics.filter((a: any) => a.platform === analyticsTab);
              if (savedReports.length < 2) return null;
              const chartData = [...savedReports].reverse().slice(-8);
              const maxR = Math.max(...chartData.map((r: any) => r.reach ?? 0), 1);
              const maxI = Math.max(...chartData.map((r: any) => r.impressions ?? 0), 1);
              return (
                <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Trend — reach vs impressions</p>
                  <div className="flex items-end gap-2" style={{ height: 72 }}>
                    {chartData.map((r: any) => (
                      <div key={r.id} className="flex-1 flex items-end gap-px">
                        <div className="flex-1 rounded-t-sm" style={{ height: `${((r.reach ?? 0) / maxR) * 100}%`, background: "#9c847a", minHeight: 4 }} title={`Reach: ${r.reach?.toLocaleString() ?? 0}`} />
                        <div className="flex-1 rounded-t-sm" style={{ height: `${((r.impressions ?? 0) / maxI) * 100}%`, background: "#c2ba9b70", minHeight: 4 }} title={`Impressions: ${r.impressions?.toLocaleString() ?? 0}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-5 mt-3">
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#9c847a" }} /> Reach
                    </span>
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                      <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#c2ba9b70" }} /> Impressions
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Log report toggle — hidden on combined view */}
            {analyticsTab !== "all" && <div className="mb-4">
              <button onClick={() => setShowLogForm((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
                style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                <Plus size={12} /> {showLogForm ? "Hide manual form" : "Log report manually"}
              </button>
            </div>}

            <AnimatePresence>
              {showLogForm && analyticsTab !== "all" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider capitalize" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Log {analyticsTab} report</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Period start</label>
                        <input type="date" value={newAnalStart} onChange={(e) => setNewAnalStart(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Period end</label>
                        <input type="date" value={newAnalEnd} onChange={(e) => setNewAnalEnd(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Reach",           val: newAnalReach,         set: setNewAnalReach },
                        { label: "Impressions",     val: newAnalImpressions,   set: setNewAnalImpressions },
                        { label: "Engagement %",    val: newAnalEngRate,       set: setNewAnalEngRate },
                        { label: "New followers",   val: newAnalNewFollowers,  set: setNewAnalNewFollowers },
                        { label: "Total followers", val: newAnalTotalFollowers, set: setNewAnalTotalFollowers },
                      ].map(({ label, val, set }) => (
                        <div key={label}>
                          <label className="block text-xs mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{label}</label>
                          <input type="number" value={val} onChange={(e) => set(e.target.value)} style={inputStyle} />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Top post URL</label>
                        <input value={newAnalTopPost} onChange={(e) => setNewAnalTopPost(e.target.value)} placeholder="https://…" style={inputStyle} />
                      </div>
                    </div>
                    <textarea placeholder="Notes (context, observations, anomalies…)" value={newAnalNotes} onChange={(e) => setNewAnalNotes(e.target.value)} rows={2} style={taStyle} />
                    <button onClick={addAnalytics} disabled={savingAnal} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                      <BarChart2 size={14} /> {savingAnal ? "Saving…" : "Save report"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved reports */}
            <div className="space-y-3">
              {analytics.filter((a: any) => a.platform === analyticsTab).map((a: any) => (
                <div key={a.id} className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                      {new Date(a.period_start).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – {new Date(a.period_end).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <button onClick={() => deleteAnalytics(a.id)} style={{ color: "#c53030" }}><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { icon: <TrendingUp size={14} />,    label: "Reach",           val: a.reach?.toLocaleString() },
                      { icon: <BarChart2 size={14} />,     label: "Impressions",     val: a.impressions?.toLocaleString() },
                      { icon: <MessageSquare size={14} />, label: "Engagement",      val: a.engagement_rate != null ? `${a.engagement_rate}%` : null },
                      { icon: <Users size={14} />,         label: "New followers",   val: a.new_followers != null ? `+${a.new_followers}` : null },
                      { icon: <Users size={14} />,         label: "Total followers", val: a.total_followers?.toLocaleString() },
                    ].filter((s) => s.val).map((stat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span style={{ color: "var(--ll-taupe)" }}>{stat.icon}</span>
                        <div>
                          <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{stat.label}</p>
                          <p className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{stat.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {a.top_post_url && (
                    <a href={a.top_post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                      <ExternalLink size={12} /> View top post
                    </a>
                  )}
                  {a.notes && <p className="text-xs mt-2" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{a.notes}</p>}
                </div>
              ))}
              {analytics.filter((a: any) => a.platform === analyticsTab).length === 0 && (
                <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No {analyticsTab} reports yet — sync Meta above or log one manually.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === "documents" && (
          <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {activeProjectId ? (
              <div className="rounded-2xl p-5 mb-6 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Upload file</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="File name" value={docName} onChange={(e) => setDocName(e.target.value)} style={inputStyle} />
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
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No project selected.</p>
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

        {/* ── BRAND KIT ── */}
        {tab === "brand-kit" && (
          <motion.div key="brand-kit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!brandKit ? (
              <div className="rounded-2xl p-8 text-center mb-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Client hasn&apos;t set up their brand kit yet.</p>
              </div>
            ) : (
              <div className="space-y-5 mb-8">
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

            {/* Brand Voice & Demeanour */}
            <div className="pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>Brand Voice &amp; Demeanour</p>
              <p className="text-xs mb-5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>How this brand speaks — guides captions, content creation, and creative direction.</p>
              <div className="space-y-4 max-w-xl">
                {[
                  { label: "Tone", value: voiceTone, set: setVoiceTone, placeholder: "e.g. Professional, warm, aspirational", ta: false },
                  { label: "Target audience", value: voiceAudience, set: setVoiceAudience, placeholder: "e.g. Affluent homeowners 35–55 who value quality craftsmanship", ta: false },
                  { label: "Tagline / sign-off", value: voiceTagline, set: setVoiceTagline, placeholder: "e.g. Built with heart.", ta: false },
                  { label: "Key messaging pillars", value: voiceMessaging, set: setVoiceMessaging, placeholder: "e.g. Quality craftsmanship · Local roots · Community focus", ta: true },
                  { label: "Words & phrases to use", value: voiceWordsUse, set: setVoiceWordsUse, placeholder: "e.g. craft, artisan, bespoke, story, authentic", ta: true },
                  { label: "Words & phrases to avoid", value: voiceWordsAvoid, set: setVoiceWordsAvoid, placeholder: "e.g. cheap, discount, deal, sale, fast", ta: true },
                ].map(({ label, value, set, placeholder, ta }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{label}</label>
                    {ta
                      ? <textarea value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} rows={2} style={taStyle} />
                      : <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={inputStyle} />
                    }
                  </div>
                ))}
                <button onClick={saveBrandVoice} disabled={savingVoice} className="text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                  {savingVoice ? "Saving…" : "Save brand voice"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ONBOARDING ── */}
        {tab === "onboarding" && (
          <motion.div key="onboarding" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Unlock onboarding access */}
            <div className="rounded-2xl p-5 mb-5 flex items-center justify-between gap-4" style={{ background: onboardingUnlocked ? "rgba(72,187,120,0.07)" : "var(--card)", border: `1px solid ${onboardingUnlocked ? "rgba(72,187,120,0.25)" : "var(--border)"}` }}>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  {onboardingUnlocked ? "Onboarding unlocked" : "Onboarding locked"}
                </p>
                <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                  {onboardingUnlocked
                    ? "Client has full access to their onboarding steps."
                    : "Client is locked to their proposal view. Unlock after they've signed the contract."}
                </p>
              </div>
              {!onboardingUnlocked && (
                <button
                  onClick={unlockOnboarding}
                  disabled={unlocking}
                  className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)", opacity: unlocking ? 0.6 : 1 }}
                >
                  {unlocking ? "Unlocking…" : "Unlock Onboarding"}
                </button>
              )}
              {onboardingUnlocked && (
                <span className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(72,187,120,0.15)", color: "#276749", fontFamily: "var(--font-body)" }}>
                  Unlocked
                </span>
              )}
            </div>

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

        {/* ── PROPOSALS ── */}
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
