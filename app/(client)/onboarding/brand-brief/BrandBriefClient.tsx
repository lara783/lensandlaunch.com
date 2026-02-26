"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface BriefData {
  // Section 1
  business_description: string;
  products_services: string;
  point_of_difference: string;
  market_position: string;
  // Section 2
  ideal_customer: string;
  customer_location: string;
  customer_problems: string;
  // Section 3
  brand_personality: string[];
  content_tone: string;
  topics_to_avoid: string;
  inspiring_accounts: string;
  // Section 4
  content_types: string[];
  content_aesthetic: string;
  what_worked: string;
  // Section 5
  primary_goal: string;
  success_definition: string;
  upcoming_events: string;
}

const EMPTY: BriefData = {
  business_description: "",
  products_services: "",
  point_of_difference: "",
  market_position: "",
  ideal_customer: "",
  customer_location: "",
  customer_problems: "",
  brand_personality: [],
  content_tone: "",
  topics_to_avoid: "",
  inspiring_accounts: "",
  content_types: [],
  content_aesthetic: "",
  what_worked: "",
  primary_goal: "",
  success_definition: "",
  upcoming_events: "",
};

// ─── Sub-components ────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
      {children}
    </p>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mb-3" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
      {children}
    </p>
  );
}

function TextArea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
      style={{
        background: "var(--secondary)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
        fontFamily: "var(--font-body)",
        overflow: "hidden",
      }}
    />
  );
}

function TextInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
      style={{
        background: "var(--secondary)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
        fontFamily: "var(--font-body)",
      }}
    />
  );
}

function RadioGroup({
  options, value, onChange,
}: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
          style={{
            background: value === o.value ? "rgba(156,132,122,0.12)" : "var(--secondary)",
            border: `1px solid ${value === o.value ? "var(--ll-taupe)" : "var(--border)"}`,
            color: value === o.value ? "var(--ll-taupe)" : "var(--foreground)",
            fontFamily: "var(--font-body)",
            fontWeight: value === o.value ? 600 : 400,
          }}
        >
          <span
            className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
            style={{ borderColor: value === o.value ? "var(--ll-taupe)" : "var(--border)" }}
          >
            {value === o.value && (
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--ll-taupe)" }} />
            )}
          </span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChipGroup({
  options, value, onChange, max,
}: { options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, opt]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: active ? "var(--ll-taupe)" : "var(--secondary)",
              color: active ? "#fff" : "var(--ll-grey)",
              border: `1px solid ${active ? "var(--ll-taupe)" : "var(--border)"}`,
              fontFamily: "var(--font-body)",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ─── Section definitions ───────────────────────────────────────────────────
const SECTIONS = [
  { title: "Your Business", subtitle: "Tell us what you do and what makes you stand out." },
  { title: "Your Audience", subtitle: "Help us understand exactly who we're speaking to." },
  { title: "Brand Personality & Voice", subtitle: "How your brand should feel and sound." },
  { title: "Content Preferences", subtitle: "The type of content that fits your brand." },
  { title: "Goals & Priorities", subtitle: "What success looks like for this partnership." },
];

const PERSONALITY_OPTIONS = [
  "Friendly", "Professional", "Playful", "Bold", "Sophisticated", "Authentic",
  "Educational", "Inspiring", "Luxurious", "Approachable", "Witty", "Adventurous",
  "Minimal", "Warm", "Empowering", "Trustworthy",
];

const CONTENT_TYPE_OPTIONS = [
  "Reels", "Carousels", "Static posts", "Stories", "Behind the scenes",
  "Educational", "Product features", "Lifestyle", "Customer stories", "UGC / Reposts",
];

// ─── Main Component ────────────────────────────────────────────────────────
export default function BrandBriefClient({
  existing,
  redirectTo = "/onboarding",
}: {
  existing: Record<string, unknown> | null;
  redirectTo?: string | null;
}) {
  const router = useRouter();
  const [section, setSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [data, setData] = useState<BriefData>(() => {
    if (!existing) return EMPTY;
    return {
      business_description: (existing.business_description as string) ?? "",
      products_services: (existing.products_services as string) ?? "",
      point_of_difference: (existing.point_of_difference as string) ?? "",
      market_position: (existing.market_position as string) ?? "",
      ideal_customer: (existing.ideal_customer as string) ?? "",
      customer_location: (existing.customer_location as string) ?? "",
      customer_problems: (existing.customer_problems as string) ?? "",
      brand_personality: (existing.brand_personality as string[]) ?? [],
      content_tone: (existing.content_tone as string) ?? "",
      topics_to_avoid: (existing.topics_to_avoid as string) ?? "",
      inspiring_accounts: (existing.inspiring_accounts as string) ?? "",
      content_types: (existing.content_types as string[]) ?? [],
      content_aesthetic: (existing.content_aesthetic as string) ?? "",
      what_worked: (existing.what_worked as string) ?? "",
      primary_goal: (existing.primary_goal as string) ?? "",
      success_definition: (existing.success_definition as string) ?? "",
      upcoming_events: (existing.upcoming_events as string) ?? "",
    };
  });

  function set<K extends keyof BriefData>(key: K, val: BriefData[K]) {
    setData((prev) => ({ ...prev, [key]: val }));
  }

  async function submit() {
    setSaving(true);

    // Save via server route (uses service role to avoid RLS issues)
    const saveRes = await fetch("/api/onboarding/save-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}));
      console.error("Brief save error:", err);
      toast.error(`Couldn't save your brief: ${(err as any).error ?? "Please try again."}`);
      setSaving(false);
      return;
    }

    const { clientId } = await saveRes.json();

    // Fire email + PDF in the background — don't block the success state
    fetch("/api/onboarding/send-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.warn("Brief email failed:", err);
        }
      })
      .catch((err) => console.warn("Brief email fetch error:", err));

    setDone(true);
    setSaving(false);
    toast.success("Brand brief saved!");
    if (redirectTo) {
      setTimeout(() => router.push(redirectTo), 2000);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-10 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <CheckCircle2 size={48} style={{ color: "var(--ll-taupe)", margin: "0 auto 16px" }} />
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
          Brief submitted — thank you!
        </h3>
        <p className="text-sm" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
          {redirectTo
            ? "Lara now has everything she needs to build your content strategy. Heading back to your setup checklist…"
            : "Your brand brief has been updated. Lara will be notified of any changes."}
        </p>
      </motion.div>
    );
  }

  const progressPct = Math.round(((section) / SECTIONS.length) * 100);

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            Section {section + 1} of {SECTIONS.length}
          </p>
          <p className="text-xs" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            {progressPct}% complete
          </p>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--ll-taupe)" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        {/* Section labels */}
        <div className="flex gap-1 mt-3">
          {SECTIONS.map((s, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i <= section ? "var(--ll-taupe)" : "var(--secondary)", opacity: i < section ? 0.5 : 1 }}
            />
          ))}
        </div>
      </div>

      {/* Section card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl p-6 mb-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h3
            className="text-xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            {SECTIONS[section].title}
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
            {SECTIONS[section].subtitle}
          </p>

          {/* ── Section 1: Business ─────────────────────────────── */}
          {section === 0 && (
            <div className="space-y-6">
              <div>
                <Label>Tell us about your business in 2–3 sentences.</Label>
                <Hint>What do you do, who do you serve, and what's the heart of your brand?</Hint>
                <TextArea
                  value={data.business_description}
                  onChange={(v) => set("business_description", v)}
                  placeholder="e.g. We're a sustainable café in Sydney serving specialty coffee and seasonal plant-based meals. Our mission is to make conscious eating feel effortless and delicious…"
                  rows={4}
                />
              </div>
              <div>
                <Label>What products or services do you offer?</Label>
                <Hint>List your key offerings — be specific so we can feature them in your content.</Hint>
                <TextArea
                  value={data.products_services}
                  onChange={(v) => set("products_services", v)}
                  placeholder="e.g. Dine-in breakfast & lunch, takeaway, corporate catering, seasonal hampers, barista training…"
                  rows={3}
                />
              </div>
              <div>
                <Label>What sets you apart from your competitors?</Label>
                <Hint>Your point of difference — what only you offer, or do better.</Hint>
                <TextArea
                  value={data.point_of_difference}
                  onChange={(v) => set("point_of_difference", v)}
                  placeholder="e.g. We source directly from 3 local farms, our entire menu is certified organic, and we've built a genuine community around slow mornings…"
                  rows={3}
                />
              </div>
              <div>
                <Label>How would you describe your market positioning?</Label>
                <Hint>This helps us get the tone and aesthetic right.</Hint>
                <RadioGroup
                  value={data.market_position}
                  onChange={(v) => set("market_position", v)}
                  options={[
                    { value: "budget", label: "Budget-friendly — accessible to everyone" },
                    { value: "mid-range", label: "Mid-range — good value for quality" },
                    { value: "premium", label: "Premium — elevated experience, higher price point" },
                    { value: "luxury", label: "Luxury — exclusive, high-end, aspirational" },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ── Section 2: Audience ──────────────────────────────── */}
          {section === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Describe your ideal customer.</Label>
                <Hint>Think about their age, gender, lifestyle, interests, values, and what drives their decisions.</Hint>
                <TextArea
                  value={data.ideal_customer}
                  onChange={(v) => set("ideal_customer", v)}
                  placeholder="e.g. Women aged 28–42, urban professionals who care about wellness, sustainability, and quality experiences. They follow food and lifestyle accounts, have disposable income, and choose brands that align with their values…"
                  rows={4}
                />
              </div>
              <div>
                <Label>Where are most of your customers based?</Label>
                <Hint>City, region, or country — helps us localise content and captions.</Hint>
                <TextInput
                  value={data.customer_location}
                  onChange={(v) => set("customer_location", v)}
                  placeholder="e.g. Sydney, NSW — primarily inner-west suburbs"
                />
              </div>
              <div>
                <Label>What problems or pain points do you solve for your customers?</Label>
                <Hint>Understanding this helps us create content that speaks directly to their needs.</Hint>
                <TextArea
                  value={data.customer_problems}
                  onChange={(v) => set("customer_problems", v)}
                  placeholder="e.g. They're time-poor and want nutritious food without the effort of cooking. They're tired of options that sacrifice taste for health. They want a third place to slow down that isn't a bar…"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── Section 3: Brand & Voice ─────────────────────────── */}
          {section === 2 && (
            <div className="space-y-6">
              <div>
                <Label>Which words best describe your brand personality?</Label>
                <Hint>Select up to 6 that feel most true to your brand.</Hint>
                <ChipGroup
                  options={PERSONALITY_OPTIONS}
                  value={data.brand_personality}
                  onChange={(v) => set("brand_personality", v)}
                  max={6}
                />
              </div>
              <div>
                <Label>How would you describe your content tone?</Label>
                <Hint>This is how your captions, stories, and copy should sound.</Hint>
                <RadioGroup
                  value={data.content_tone}
                  onChange={(v) => set("content_tone", v)}
                  options={[
                    { value: "very-casual", label: "Very casual — relaxed, conversational, like a friend" },
                    { value: "conversational", label: "Conversational — warm and approachable, but polished" },
                    { value: "balanced", label: "Balanced — professional yet personable" },
                    { value: "professional", label: "Professional — credible, authoritative, refined" },
                    { value: "formal", label: "Formal — corporate and official tone" },
                  ]}
                />
              </div>
              <div>
                <Label>Are there any topics or content styles we should NEVER post about?</Label>
                <Hint>Politics, competitors, anything off-brand — tell us your boundaries.</Hint>
                <TextArea
                  value={data.topics_to_avoid}
                  onChange={(v) => set("topics_to_avoid", v)}
                  placeholder="e.g. No political content, no diet culture language, never mention other cafés by name…"
                  rows={2}
                />
              </div>
              <div>
                <Label>Which accounts inspire you? (inside and outside your industry)</Label>
                <Hint>Share Instagram handles, TikTok accounts, or brands you admire — so we understand the look, feel, and tone you're drawn to.</Hint>
                <TextArea
                  value={data.inspiring_accounts}
                  onChange={(v) => set("inspiring_accounts", v)}
                  placeholder="e.g. @nourishing.amy (food/wellness), @thewhitecompany (aesthetic), @glossier (brand voice), @frank_bod (playful copy)…"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── Section 4: Content ───────────────────────────────── */}
          {section === 3 && (
            <div className="space-y-6">
              <div>
                <Label>What types of content do you want us to create?</Label>
                <Hint>Select everything that fits. We'll build your strategy around these formats.</Hint>
                <ChipGroup
                  options={CONTENT_TYPE_OPTIONS}
                  value={data.content_types}
                  onChange={(v) => set("content_types", v)}
                />
              </div>
              <div>
                <Label>What aesthetic or vibe do you want to convey?</Label>
                <Hint>This guides our photography direction, editing style, and visual language.</Hint>
                <RadioGroup
                  value={data.content_aesthetic}
                  onChange={(v) => set("content_aesthetic", v)}
                  options={[
                    { value: "bright-airy", label: "Bright & airy — light, fresh, soft tones" },
                    { value: "dark-moody", label: "Dark & moody — rich, dramatic, high-contrast" },
                    { value: "bold-colourful", label: "Bold & colourful — vibrant, energetic, expressive" },
                    { value: "clean-minimal", label: "Clean & minimal — simple, structured, white space" },
                    { value: "warm-organic", label: "Warm & organic — earthy, natural, textured" },
                    { value: "rustic-earthy", label: "Rustic & earthy — raw, grounded, handmade feel" },
                  ]}
                />
              </div>
              <div>
                <Label>Has anything worked particularly well for you on social media in the past?</Label>
                <Hint>Tell us about any posts, campaigns, or content styles that got great engagement or response.</Hint>
                <TextArea
                  value={data.what_worked}
                  onChange={(v) => set("what_worked", v)}
                  placeholder="e.g. Behind-the-scenes videos of us prepping the menu always got huge engagement. Our 'day in the life' reel hit 40K views. Static product shots tend to underperform for us…"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── Section 5: Goals ─────────────────────────────────── */}
          {section === 4 && (
            <div className="space-y-6">
              <div>
                <Label>What is your #1 goal for social media right now?</Label>
                <Hint>Pick the outcome that matters most to your business at this stage.</Hint>
                <RadioGroup
                  value={data.primary_goal}
                  onChange={(v) => set("primary_goal", v)}
                  options={[
                    { value: "brand-awareness", label: "Build brand awareness — more people know who we are" },
                    { value: "website-traffic", label: "Drive website traffic — convert social to site visits" },
                    { value: "leads", label: "Generate leads — enquiries, bookings, DMs" },
                    { value: "grow-following", label: "Grow our following — increase our community size" },
                    { value: "sales", label: "Increase sales — direct revenue from social" },
                    { value: "community", label: "Build community — deeper loyalty with existing audience" },
                  ]}
                />
              </div>
              <div>
                <Label>What would make this partnership feel like a huge success to you?</Label>
                <Hint>Your answer here shapes how we measure and report on our work together.</Hint>
                <TextArea
                  value={data.success_definition}
                  onChange={(v) => set("success_definition", v)}
                  placeholder="e.g. We'd consider it a success if we're getting consistent enquiries through Instagram, our account feels cohesive and professional, and we're not having to think about content anymore…"
                  rows={3}
                />
              </div>
              <div>
                <Label>Are there any upcoming events, launches, or campaigns in the next 3 months?</Label>
                <Hint>Seasonal menus, product drops, events, collaborations, anniversaries — anything we should plan content around.</Hint>
                <TextArea
                  value={data.upcoming_events}
                  onChange={(v) => set("upcoming_events", v)}
                  placeholder="e.g. Winter menu launch in June, pop-up at Marrickville Markets in July, we're turning 5 in August…"
                  rows={3}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setSection((s) => s - 1)}
          disabled={section === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "var(--secondary)",
            border: "1px solid var(--border)",
            color: section === 0 ? "var(--ll-grey)" : "var(--foreground)",
            fontFamily: "var(--font-body)",
            opacity: section === 0 ? 0.4 : 1,
            cursor: section === 0 ? "not-allowed" : "pointer",
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {section < SECTIONS.length - 1 ? (
          <button
            type="button"
            onClick={() => setSection((s) => s + 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "var(--ll-taupe)",
              color: "#fff",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
            }}
          >
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "var(--ll-taupe)",
              color: "#fff",
              fontFamily: "var(--font-body)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Submitting…" : "Submit brief"}
            {!saving && <CheckCircle2 size={14} />}
          </button>
        )}
      </div>

      <p className="text-xs text-center mt-4" style={{ color: "var(--ll-grey)", fontFamily: "var(--font-body)" }}>
        Your answers are saved automatically when you submit. You can update them anytime from your portal.
      </p>
    </div>
  );
}
