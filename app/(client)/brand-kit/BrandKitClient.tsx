"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ImageIcon } from "lucide-react";

export interface BrandColor {
  label: string;
  hex: string;
}

export interface BrandFont {
  name: string;
  source: "system" | "upload";
  url?: string;
}

export interface BrandKit {
  id?: string;
  client_id: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  logo_url: string | null;
}

export interface ClientAsset {
  id: string;
  name: string;
  file_url: string;
  asset_type: string;
  size_bytes: number | null;
  created_at: string;
}

const SYSTEM_FONTS = [
  "Montserrat",
  "Playfair Display",
  "Inter",
  "Lato",
  "Open Sans",
  "Raleway",
  "Nunito",
  "Poppins",
  "Merriweather",
  "Source Sans Pro",
  "DM Sans",
  "Work Sans",
  "Josefin Sans",
  "Cormorant Garamond",
  "EB Garamond",
];

const COLOR_LABELS = ["Primary", "Secondary", "Accent", "Background"];

const inputStyle: React.CSSProperties = {
  background: "var(--secondary)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontFamily: "var(--font-body)",
  fontSize: "0.875rem",
  padding: "0.5rem 0.75rem",
  outline: "none",
  width: "100%",
};

function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  clientId: string;
  initial: BrandKit | null;
  initialAssets: ClientAsset[];
}

export default function BrandKitClient({ clientId, initial, initialAssets }: Props) {
  const [colors, setColors] = useState<BrandColor[]>(
    initial?.colors?.length
      ? initial.colors
      : COLOR_LABELS.map((label) => ({ label, hex: "#9c847a" }))
  );
  const [fonts, setFonts] = useState<BrandFont[]>(
    initial?.fonts?.length ? initial.fonts : []
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logo_url ?? null);
  const [assets, setAssets] = useState<ClientAsset[]>(initialAssets);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>(SYSTEM_FONTS[0]);
  const [fontUploadName, setFontUploadName] = useState("");
  const fontFileRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  /* ── Colors ── */
  function updateColor(i: number, hex: string) {
    setColors(colors.map((c, idx) => (idx === i ? { ...c, hex } : c)));
  }

  function addColor() {
    if (colors.length >= 8) return;
    setColors([...colors, { label: `Colour ${colors.length + 1}`, hex: "#010101" }]);
  }

  function removeColor(i: number) {
    setColors(colors.filter((_, idx) => idx !== i));
  }

  /* ── Fonts ── */
  function addSystemFont() {
    if (fonts.find((f) => f.name === selectedFont)) {
      toast.error("Font already added.");
      return;
    }
    setFonts([...fonts, { name: selectedFont, source: "system" }]);
  }

  async function uploadFont(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = fontUploadName.trim() || file.name.replace(/\.[^.]+$/, "");
    if (fonts.find((f) => f.name === name)) {
      toast.error("A font with that name already exists.");
      return;
    }
    setSaving(true);
    try {
      const path = `${clientId}/fonts/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("assets")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
      setFonts([...fonts, { name, source: "upload", url: publicUrl }]);
      setFontUploadName("");
      if (fontFileRef.current) fontFileRef.current.value = "";
      toast.success("Font uploaded.");
    } catch {
      toast.error("Font upload failed. Make sure the 'assets' bucket exists in Supabase.");
    } finally {
      setSaving(false);
    }
  }

  function removeFont(i: number) {
    setFonts(fonts.filter((_, idx) => idx !== i));
  }

  /* ── Logo upload ── */
  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const path = `${clientId}/logo/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("assets")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
      setLogoUrl(publicUrl);
      toast.success("Logo uploaded.");
    } catch {
      toast.error("Upload failed. Make sure the 'assets' storage bucket exists in Supabase.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  /* ── Asset upload ── */
  async function uploadAsset(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAsset(true);
    try {
      const path = `${clientId}/assets/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("assets")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);
      const { data: inserted, error: insertErr } = await (supabase as any)
        .from("client_assets")
        .insert({
          client_id: clientId,
          name: file.name,
          file_url: publicUrl,
          asset_type: "other",
          size_bytes: file.size,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      setAssets([inserted, ...assets]);
      toast.success("Asset uploaded.");
    } catch {
      toast.error("Upload failed. Make sure the 'assets' bucket and client_assets table exist.");
    } finally {
      setUploadingAsset(false);
      if (assetFileRef.current) assetFileRef.current.value = "";
    }
  }

  async function deleteAsset(id: string) {
    setAssets(assets.filter((a) => a.id !== id));
    await (supabase as any).from("client_assets").delete().eq("id", id);
    toast.success("Removed.");
  }

  /* ── Save brand kit ── */
  async function saveBrandKit() {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("brand_kits")
        .upsert(
          { client_id: clientId, colors, fonts, logo_url: logoUrl, updated_at: new Date().toISOString() },
          { onConflict: "client_id" }
        );
      if (error) throw error;
      toast.success("Brand kit saved.");
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed. Run SQL migration 004 first.");
    } finally {
      setSaving(false);
    }
  }

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--ll-grey)",
    marginBottom: "1rem",
  };

  const card: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "1.5rem",
    marginBottom: "1.5rem",
  };

  return (
    <div>
      {/* ── Brand Colours ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={card}
      >
        <p style={sectionLabel}>Brand Colours</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {colors.map((c, i) => (
            <div key={i} className="flex flex-col gap-2">
              {/* Swatch + picker */}
              <label
                className="relative w-full h-16 rounded-xl cursor-pointer overflow-hidden group"
                style={{ border: "2px solid var(--border)" }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: c.hex }}
                />
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColor(i, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
                  >
                    Edit
                  </span>
                </div>
              </label>

              {/* HEX input */}
              <input
                type="text"
                value={c.hex}
                onChange={(e) => {
                  const val = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                  updateColor(i, val);
                }}
                maxLength={7}
                style={{ ...inputStyle, textAlign: "center", fontSize: "0.75rem", padding: "0.35rem 0.5rem" }}
              />

              {/* Label + remove */}
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) =>
                    setColors(colors.map((cc, idx) => idx === i ? { ...cc, label: e.target.value } : cc))
                  }
                  style={{ ...inputStyle, fontSize: "0.7rem", padding: "0.25rem 0.5rem", flex: 1 }}
                  placeholder="Label"
                />
                {colors.length > 1 && (
                  <button
                    onClick={() => removeColor(i)}
                    className="ml-2 shrink-0"
                    style={{ color: "#c53030" }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {colors.length < 8 && (
          <button
            onClick={addColor}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}
          >
            <Plus size={14} /> Add colour
          </button>
        )}
      </motion.div>

      {/* ── Brand Fonts ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={card}
      >
        <p style={sectionLabel}>Brand Fonts</p>

        {/* Selected fonts list */}
        {fonts.length > 0 && (
          <div className="space-y-2 mb-5">
            {fonts.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ fontFamily: f.source === "system" ? f.name : "var(--font-body)", color: "var(--foreground)" }}
                  >
                    {f.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
                    {f.source === "upload" ? "Custom upload" : "Google Font"}
                  </p>
                </div>
                <button onClick={() => removeFont(i)} style={{ color: "#c53030" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add from Google Fonts list */}
        <div className="flex gap-2 mb-4">
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            {SYSTEM_FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button
            onClick={addSystemFont}
            className="px-4 py-2 rounded-xl text-sm font-semibold shrink-0"
            style={{ background: "#010101", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            Add
          </button>
        </div>

        {/* Upload custom font */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Upload a custom font (.ttf, .otf, .woff2)
          </p>
          <input
            type="text"
            placeholder="Font name (e.g. My Brand Font)"
            value={fontUploadName}
            onChange={(e) => setFontUploadName(e.target.value)}
            style={inputStyle}
          />
          <label
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer w-fit"
            style={{ background: saving ? "var(--secondary)" : "var(--ll-taupe)", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            <Upload size={14} />
            Choose font file
            <input
              ref={fontFileRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              className="hidden"
              onChange={uploadFont}
              disabled={saving}
            />
          </label>
        </div>
      </motion.div>

      {/* ── Logo ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={card}
      >
        <p style={sectionLabel}>Logo</p>
        <div className="flex items-start gap-6 flex-wrap">
          {/* Preview */}
          <div
            className="w-32 h-32 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "var(--secondary)", border: "2px dashed var(--border)" }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Brand logo" className="w-full h-full object-contain rounded-2xl p-2" />
            ) : (
              <ImageIcon size={32} style={{ color: "var(--ll-neutral)" }} />
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
              Upload your primary logo in PNG or SVG format, high resolution preferred.
            </p>
            <label
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer w-fit"
              style={{ background: uploadingLogo ? "var(--secondary)" : "#010101", color: uploadingLogo ? "var(--ll-grey)" : "#fff", fontFamily: "var(--font-body)" }}
            >
              <Upload size={14} />
              {uploadingLogo ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/*,.svg" className="hidden" onChange={uploadLogo} disabled={uploadingLogo} />
            </label>
          </div>
        </div>
      </motion.div>

      {/* ── Additional Assets ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={card}
      >
        <p style={sectionLabel}>Brand Assets</p>
        <p className="text-sm mb-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          Upload additional brand files — secondary logos, icon marks, brand guide PDFs, hi-res images.
        </p>

        <label
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer w-fit mb-5"
          style={{ background: uploadingAsset ? "var(--secondary)" : "#010101", color: uploadingAsset ? "var(--ll-grey)" : "#fff", fontFamily: "var(--font-body)" }}
        >
          <Upload size={14} />
          {uploadingAsset ? "Uploading…" : "Upload asset"}
          <input
            ref={assetFileRef}
            type="file"
            className="hidden"
            onChange={uploadAsset}
            disabled={uploadingAsset}
          />
        </label>

        {assets.length > 0 ? (
          <div className="space-y-2">
            {assets.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{a.name}</p>
                  {a.size_bytes && <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>{formatBytes(a.size_bytes)}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: "var(--ll-taupe)", fontFamily: "var(--font-body)" }}>View</a>
                  <button onClick={() => deleteAsset(a.id)} style={{ color: "#c53030" }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>No assets uploaded yet.</p>
        )}
      </motion.div>

      {/* Save */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={saveBrandKit}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold"
        style={{
          background: saving ? "var(--secondary)" : "#010101",
          color: saving ? "var(--ll-grey)" : "#fff",
          fontFamily: "var(--font-body)",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving…" : "Save Brand Kit"}
      </motion.button>
    </div>
  );
}
