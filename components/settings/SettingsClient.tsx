"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Camera, Eye, EyeOff } from "lucide-react";

interface Props {
  userId: string;
  initialName: string;
  initialBusinessName: string | null;
  initialEmail: string;
  initialAvatarUrl: string | null;
  showBusinessName: boolean;
}

const inputStyle: React.CSSProperties = {
  background: "var(--secondary)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontFamily: "var(--font-body)",
  fontSize: "0.875rem",
  padding: "0.6rem 0.75rem",
  outline: "none",
  width: "100%",
};

export default function SettingsClient({
  userId,
  initialName,
  initialBusinessName,
  initialEmail,
  initialAvatarUrl,
  showBusinessName,
}: Props) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [name, setName] = useState(initialName);
  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSavingProfile(true);

    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, avatarFile, { cacheControl: "3600", upsert: true });
      if (upErr) {
        toast.error("Avatar upload failed: " + upErr.message);
        setSavingProfile(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
      newAvatarUrl = publicUrl;
      setAvatarUrl(newAvatarUrl);
      setAvatarPreview(null);
      setAvatarFile(null);
    }

    const updates: Record<string, string | null> = {
      full_name: name.trim(),
      avatar_url: newAvatarUrl,
    };
    if (showBusinessName) updates.business_name = businessName.trim() || null;

    const { error } = await (supabase as any)
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    setSavingProfile(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }
    toast.success("Profile updated.");
  }

  async function savePassword() {
    if (!newPassword) { toast.error("Enter a new password."); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { toast.error("Failed to update password: " + error.message); return; }
    toast.success("Password updated.");
    setNewPassword("");
    setConfirmPassword("");
  }

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="max-w-xl space-y-8">

      {/* Profile section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 space-y-5"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          Profile
        </p>

        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={name}
                className="w-16 h-16 rounded-full object-cover"
                style={{ border: "2px solid var(--border)" }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: "var(--ll-taupe)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "#010101", border: "2px solid var(--card)" }}
            >
              <Camera size={11} color="white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
              {name || "Your name"}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs mt-0.5 hover:opacity-70 transition-opacity"
              style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
            >
              Change photo
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              Full name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              style={inputStyle}
            />
          </div>

          {showBusinessName && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                Business name
              </label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              Email
            </label>
            <input
              value={initialEmail}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              To change your email, contact Lens &amp; Launch.
            </p>
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="text-sm font-semibold px-5 py-2.5 rounded-xl"
          style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
        >
          {savingProfile ? "Saving…" : "Save profile"}
        </button>
      </motion.div>

      {/* Password section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          Change password
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{ ...inputStyle, paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ll-grey)" }}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                style={{ ...inputStyle, paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ll-grey)" }}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={savePassword}
          disabled={savingPassword}
          className="text-sm font-semibold px-5 py-2.5 rounded-xl"
          style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
        >
          {savingPassword ? "Updating…" : "Update password"}
        </button>
      </motion.div>

    </div>
  );
}
