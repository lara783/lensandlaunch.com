"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, X, KeyRound, Eye, EyeOff, ExternalLink, CheckCircle2 } from "lucide-react";
import type { TeamMember } from "@/lib/supabase/types";

interface Props {
  teamMembers: TeamMember[];
  projects: any[];
  assignments: any[];
}

const inputStyle: React.CSSProperties = {
  background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 10,
  color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "0.875rem",
  padding: "0.5rem 0.75rem", outline: "none", width: "100%",
};

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function AdminTeamClient({ teamMembers: initMembers, projects, assignments: initAssignments }: Props) {
  const supabase = createClient();
  const [members, setMembers] = useState(initMembers);
  const [assignments, setAssignments] = useState(initAssignments);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // New member form
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Assignment form
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  // Login setup
  const [setupLoginId, setSetupLoginId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);

  // Preview
  const [generatingPreview, setGeneratingPreview] = useState<string | null>(null);

  async function addMember() {
    if (!name.trim() || !role.trim()) { toast.error("Name and role are required."); return; }
    setSaving(true);

    let avatarUrl: string | null = null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `team-avatars/${Date.now()}-${name.trim().toLowerCase().replace(/\s+/g, "-")}.${ext}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, avatarFile, { cacheControl: "3600", upsert: true });
      if (upErr) { toast.error(`Avatar upload failed: ${upErr.message}`); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
      avatarUrl = publicUrl;
    }

    const { data, error } = await (supabase as any).from("team_members")
      .insert({ name: name.trim(), role: role.trim(), email: email.trim() || null, phone: phone.trim() || null, bio: bio.trim() || null, avatar_url: avatarUrl, sort_order: members.length })
      .select().single();
    setSaving(false);
    if (error) { toast.error(`Failed to add member: ${error.message}`); return; }
    setMembers([...members, data]);
    setName(""); setRole(""); setEmail(""); setPhone(""); setBio(""); setAvatarFile(null); setAvatarPreview(null);
    setShowAdd(false);
    toast.success("Team member added.");
  }

  async function deleteMember(id: string) {
    setMembers(members.filter((m) => m.id !== id));
    setAssignments(assignments.filter((a) => a.team_member_id !== id));
    await (supabase as any).from("team_members").delete().eq("id", id);
    toast.success("Removed.");
  }

  async function assignToProject() {
    if (!assigningMemberId || !assignProjectId) { toast.error("Select a project."); return; }
    setSaving(true);
    const { data, error } = await (supabase as any).from("project_team_assignments")
      .insert({ team_member_id: assigningMemberId, project_id: assignProjectId, role_on_project: assignRole.trim() || null, team_notes: assignNotes.trim() || null })
      .select().single();
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Already assigned to that project.");
      else toast.error("Failed to assign.");
      return;
    }
    setAssignments([...assignments, data]);
    setAssigningMemberId(null); setAssignProjectId(""); setAssignRole(""); setAssignNotes("");
    toast.success("Assigned to project.");
  }

  async function removeAssignment(id: string) {
    setAssignments(assignments.filter((a) => a.id !== id));
    await (supabase as any).from("project_team_assignments").delete().eq("id", id);
  }

  function openSetupLogin(m: TeamMember) {
    setSetupLoginId(m.id);
    setLoginEmail(m.email ?? "");
    setLoginPassword(generatePassword());
    setShowPassword(true);
  }

  async function saveLogin(m: TeamMember) {
    if (!loginEmail.trim()) { toast.error("Email is required."); return; }
    if (loginPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSavingLogin(true);
    const res = await fetch("/api/admin/create-team-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamMemberId: m.id, email: loginEmail.trim(), password: loginPassword, name: m.name }),
    });
    const json = await res.json();
    setSavingLogin(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to create login."); return; }
    // Update local member to show profile_id is now set
    setMembers((prev) => prev.map((mem) => mem.id === m.id ? { ...mem, profile_id: json.userId, email: loginEmail.trim() } : mem));
    setSetupLoginId(null);
    toast.success(`Login created for ${m.name}. Share: ${loginEmail.trim()} / ${loginPassword}`);
  }

  async function openPreview(m: TeamMember) {
    if (!m.email) { toast.error("No email on this team member."); return; }
    setGeneratingPreview(m.id);
    const res = await fetch("/api/admin/team-preview-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: m.email }),
    });
    const json = await res.json();
    setGeneratingPreview(null);
    if (!res.ok) { toast.error(json.error ?? "Failed to generate preview link."); return; }
    window.open(json.link, "_blank");
    toast.success("Opened preview in new tab. Use incognito to stay logged in as yourself.");
  }

  return (
    <div className="space-y-8">
      {/* Add member form */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Team Members</h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Plus size={12} /> Add member
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
              <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--ll-taupe)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>New team member</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                  <input placeholder="Role (e.g. Photographer & Director) *" value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle} />
                  <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                  <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                  <div className="flex items-center gap-3">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-10 h-10 rounded-full object-cover shrink-0" style={{ border: "2px solid var(--border)" }} />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--secondary)", border: "2px solid var(--border)" }}>
                        <span className="text-xs" style={{ color: "var(--ll-grey)" }}>Photo</span>
                      </div>
                    )}
                    <label className="flex-1 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer" style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                      Upload photo (optional)
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setAvatarFile(f);
                        setAvatarPreview(f ? URL.createObjectURL(f) : null);
                      }} />
                    </label>
                  </div>
                </div>
                <textarea placeholder="Short bio (shown to clients)" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                <div className="flex gap-2">
                  <button onClick={addMember} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                    {saving ? "Saving…" : "Add member"}
                  </button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {members.map((m) => {
            const memberAssignments = assignments.filter((a) => a.team_member_id === m.id);
            const hasLogin = !!m.profile_id;

            return (
              <div key={m.id} className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} className="w-12 h-12 rounded-full object-cover shrink-0" style={{ border: "2px solid var(--border)" }} />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--ll-taupe)", color: "#fff", fontFamily: "var(--font-body)" }}>
                        {m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{m.name}</p>
                        {hasLogin && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(39,103,73,0.08)", color: "#276749", fontFamily: "var(--font-body)" }}>
                            <CheckCircle2 size={10} /> Portal access
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>{m.role}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {m.email && <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{m.email}</span>}
                        {m.phone && <span className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{m.phone}</span>}
                      </div>
                      {m.bio && <p className="text-xs mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{m.bio}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Preview button — only if login exists */}
                    {hasLogin && (
                      <button
                        onClick={() => openPreview(m)}
                        disabled={generatingPreview === m.id}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                        style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", border: "1px solid rgba(156,132,122,0.2)", fontFamily: "var(--font-body)" }}
                        title="Preview portal as this team member"
                      >
                        <ExternalLink size={11} /> {generatingPreview === m.id ? "…" : "Preview"}
                      </button>
                    )}

                    {/* Setup / reset login */}
                    <button
                      onClick={() => setupLoginId === m.id ? setSetupLoginId(null) : openSetupLogin(m)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                      style={{ background: "var(--secondary)", color: hasLogin ? "var(--ll-grey)" : "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                      title={hasLogin ? "Reset password" : "Set up portal login"}
                    >
                      <KeyRound size={11} /> {hasLogin ? "Reset" : "Set up login"}
                    </button>

                    <button
                      onClick={() => { setAssigningMemberId(assigningMemberId === m.id ? null : m.id); setAssignProjectId(""); setAssignRole(""); }}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                      style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                    >
                      <UserPlus size={12} /> Assign
                    </button>
                    <button onClick={() => deleteMember(m.id)} style={{ color: "#c53030" }}><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Login setup panel */}
                <AnimatePresence>
                  {setupLoginId === m.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                      <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                          {hasLogin ? "Reset portal password" : "Set up portal login"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Email</label>
                            <input
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="team@email.com"
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                style={{ ...inputStyle, paddingRight: "2.5rem" }}
                              />
                              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ll-grey)" }}>
                                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => saveLogin(m)}
                            disabled={savingLogin}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                            style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
                          >
                            {savingLogin ? "Saving…" : hasLogin ? "Reset password" : "Create login"}
                          </button>
                          <button
                            onClick={() => setLoginPassword(generatePassword())}
                            className="text-xs px-3 py-1.5 rounded-xl"
                            style={{ background: "var(--secondary)", color: "var(--ll-taupe)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                          >
                            Generate password
                          </button>
                          <button onClick={() => setSetupLoginId(null)} className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                            Cancel
                          </button>
                        </div>
                        <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                          Share these credentials with {m.name.split(" ")[0]} so they can log in at{" "}
                          <span style={{ color: "var(--ll-taupe)" }}>{process.env.NEXT_PUBLIC_APP_URL ?? "your portal URL"}/login</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Assign to project form */}
                <AnimatePresence>
                  {assigningMemberId === m.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                      <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>Assign to project</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select value={assignProjectId} onChange={(e) => setAssignProjectId(e.target.value)} style={inputStyle}>
                            <option value="">Select project…</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>{p.profiles?.full_name} — {p.name}</option>
                            ))}
                          </select>
                          <input placeholder="Role on project (e.g. Lead Photographer)" value={assignRole} onChange={(e) => setAssignRole(e.target.value)} style={inputStyle} />
                        </div>
                        <textarea
                          placeholder="Notes for this team member on this project (e.g. Experience lead — must be on location for shoot, bring lighting kit)"
                          value={assignNotes}
                          onChange={(e) => setAssignNotes(e.target.value)}
                          rows={2}
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                        <div className="flex gap-2">
                          <button onClick={assignToProject} disabled={saving} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}>
                            {saving ? "Saving…" : "Assign"}
                          </button>
                          <button onClick={() => setAssigningMemberId(null)} className="px-3 py-1.5 rounded-xl text-xs" style={{ background: "var(--secondary)", color: "var(--ll-grey)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Current assignments */}
                {memberAssignments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {memberAssignments.map((a) => {
                      const proj = projects.find((p) => p.id === a.project_id);
                      return (
                        <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: "rgba(156,132,122,0.12)", color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>
                          <span>{proj ? `${proj.profiles?.full_name} — ${proj.name}` : a.project_id}</span>
                          {a.role_on_project && <span style={{ color: "var(--ll-grey)" }}>· {a.role_on_project}</span>}
                          <button onClick={() => removeAssignment(a.id)} style={{ color: "var(--ll-grey)" }}><X size={10} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No team members yet. Add one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
