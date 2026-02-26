# Lens & Launch Portal — Pre-Deploy Testing Checklist

## Test Account

| Field    | Value                     |
|----------|---------------------------|
| Email    | `test@coastalcafe.com.au` |
| Password | `Demo1234!`               |
| Name     | Sarah Nguyen              |
| Business | Coastal Café Co.          |

**Create the account** by running once after deploying:
```bash
curl -X POST https://portal.lensandlaunch.com/api/seed/bare \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Part 1 — Admin Setup (do this first, logged in as Lara)

### 1.1 Client Management
- [ ] Go to **Admin → Clients** — Sarah Nguyen appears in the list
- [ ] Click into Sarah's client detail page
- [ ] All tabs are visible: Timeline · Calendar · Invoices · Proposals · Documents · Analytics · Meetings · Brand Kit · Onboarding

### 1.2 Create a Project
- [ ] In the client detail page, add a new project:
  - Name: `Content Retainer — 2026`
  - Service type: `Retainer`
  - Status: `Active`
- [ ] Project appears in the Timeline tab

### 1.3 Add Deliverables
- [ ] Add at least 3 deliverables to the project:
  - `Brand Photography — January` (mark agency as done)
  - `Social Reels — February Pack` (mark agency as done)
  - `Monthly Strategy Document` (leave both unchecked)
- [ ] Deliverables appear with dual-checkbox rows

### 1.4 Calendar Events + Auto-scheduling
- [ ] Add a **Shoot** event for the project → confirm it auto-creates an **Edit** event (+3 days) and **Publish** event (+10 days)
- [ ] Since it's a retainer and the first shoot, confirm **13 Monthly Report** events were auto-created (~6 weeks out, then every 28 days)
- [ ] Edit an existing calendar event — title/date updates correctly
- [ ] Delete a calendar event — it disappears

### 1.5 Invoices
- [ ] Add an invoice:
  - Invoice number: `INV-001`
  - Amount: `$2,100`
  - Status: `Pending`
  - At least 1 line item
- [ ] Invoice appears in the Invoices tab with line items expandable

### 1.6 Proposals — Build & Send
- [ ] Go to **Admin → Proposals → New**
- [ ] Select Sarah Nguyen as the client
- [ ] Add a title and at least 4 sections (Overview, Scope, Investment, Next Steps)
- [ ] Use **"Write with AI"** on at least one section — content populates
- [ ] Toggle **"Use tiered pricing"** on the Investment section — 3 tier cards appear
- [ ] Toggle **"Use scope table"** on the Scope section — comparison table editor appears
- [ ] Click **"Generate all with AI"** — all sections populate
- [ ] **Save Draft** — proposal saves without sending
- [ ] Click **"Send to Client"** — proposal status changes to `sent`, client notification email fires
- [ ] Check that a PDF is being generated (admin proposal view shows "Download PDF" or "Generate PDF" button)
- [ ] Click **"Generate PDF"** if not yet generated — spinner shows → "Download PDF" button appears
- [ ] Click **"Download PDF"** — PDF opens in new tab with branded layout

### 1.7 Meeting Logs
- [ ] In the Meetings tab, add a meeting log entry (title, date, summary, action items)
- [ ] Meeting appears in the list

### 1.8 Brand Kit (Admin View)
- [ ] In the Brand Kit tab, add brand colours (hex codes)
- [ ] Add font names
- [ ] Add brand voice adjectives and style description
- [ ] Upload a logo (or skip if no file available)

### 1.9 Analytics Toggle
- [ ] In the Analytics tab, confirm the **Client Access toggle** is OFF by default
- [ ] Toggle it ON — Sarah's account now has analytics access
- [ ] Toggle it back OFF — access revoked

### 1.10 Add Analytics Data
- [ ] Toggle analytics access ON
- [ ] Add analytics data for Instagram:
  - Period: January 2026
  - Reach, Impressions, New Followers, Engagement Rate
- [ ] Add analytics data for Facebook
- [ ] Admin dashboard (Admin → Overview) shows analytics summary section — expand it

### 1.11 Onboarding Tab (Admin view)
- [ ] Onboarding tab shows 7 admin onboarding steps
- [ ] Steps reflect actual state (Brand Kit steps show ✓ after adding brand data above)

---

## Part 2 — Client Experience (log in as sarah / test@coastalcafe.com.au)

### 2.1 Forced Onboarding
- [ ] After logging in, client is **immediately redirected to /onboarding** (not dashboard)
- [ ] Cannot navigate away (any other route redirects back to /onboarding)

### 2.2 Onboarding Page
- [ ] Page loads with "Welcome, Sarah." heading
- [ ] Progress bar shows correct completion %
- [ ] Completed steps (from admin data entry above) show as ticked
- [ ] **"Book your onboarding call" CTA** links to `/schedule/onboarding-call`
- [ ] HubSpot onboarding calendar loads on that page

### 2.3 Complete Onboarding
- [ ] With ≥5 steps complete, **"Setup complete — continue to dashboard"** button appears
- [ ] Click it → redirected to `/dashboard` ✓
- [ ] **"Onboarding" disappears from the sidebar** after completion

### 2.4 Dashboard
- [ ] Project name and progress ring visible
- [ ] Invoice "due" stat shows INV-001
- [ ] Next deliverable shown
- [ ] Deliverable list loads with dual checkboxes

### 2.5 Approving Deliverables
- [ ] Go to **Deliverables / Timeline**
- [ ] Client checkbox appears only on the client's approval column (agency column is read-only for client)
- [ ] Check the client approval box on a deliverable where agency has approved → checkbox saves ✓
- [ ] Cannot check agency column (read-only)

### 2.6 Calendar
- [ ] Calendar loads with shoot/edit/publish/report events
- [ ] Events are colour-coded correctly
- [ ] Client cannot edit or delete events (read-only)

### 2.7 Invoices
- [ ] Invoice list loads, shows INV-001 as Pending
- [ ] Click to expand → line items visible
- [ ] No "Pay Now" button — only status badge + email payment note

### 2.8 Proposals — Viewing & Signing
- [ ] Proposal appears in Proposals list
- [ ] Click to open — full proposal view loads with all sections
- [ ] Section navigation tabs at top work (clicking a tab scrolls to that section)
- [ ] Sticky bottom CTA shows "Not right for me" + "Accept & Sign Proposal"
- [ ] Click **"Accept & Sign Proposal"**
- [ ] Modal opens — **Full Name** and **Email** fields are required
- [ ] **Signature pad** is greyed out until name + email are filled
- [ ] Fill in name, email, phone → draw signature → click **"Sign & Accept"**
- [ ] Signature saves ✓ — signed block appears with name/email/phone/timestamp
- [ ] CTA bar disappears (irrevocable — can't decline after signing)
- [ ] **Check email**: Lara receives a "✍ Sarah signed the proposal" alert at lara@lensandlaunch.com

### 2.9 Brand Kit (Client View)
- [ ] Brand Kit page loads — shows colours, fonts, voice guidelines
- [ ] Can add/edit brand colours
- [ ] Can upload assets

### 2.10 Documents
- [ ] Documents page loads (may be empty — that's fine)

### 2.11 Team
- [ ] Team page loads (may show no members if none added — check empty state)

### 2.12 Analytics (Gated)
- [ ] While analytics is OFF: visiting `/analytics` redirects to `/dashboard`
- [ ] **Admin enables analytics** for Sarah → client refreshes → Analytics tab appears in sidebar
- [ ] Platform tabs (Instagram / Facebook / TikTok) switch correctly
- [ ] KPI cards show data (reach, impressions, followers, engagement)
- [ ] Sparklines render in KPI cards
- [ ] Period report list loads at the bottom

### 2.13 Book a Call (General)
- [ ] Go to **Book a Call** in sidebar → HubSpot general booking calendar loads

---

## Part 3 — Admin Follow-up (after client signed)

### 3.1 Counter-Signature
- [ ] Admin opens the signed proposal (Admin → Proposals → [proposal])
- [ ] **"Counter-sign"** button visible in admin nav bar (green, shield icon)
- [ ] Click it — admin signature modal opens
- [ ] Admin name pre-filled from profile — can edit
- [ ] Draw admin signature → submit
- [ ] Signed block now shows **both** client signature + Lens & Launch counter-signature

### 3.2 PDF in Admin View
- [ ] After counter-signing, "Download PDF" still accessible
- [ ] PDF includes all proposal sections, pricing tiers, scope table

### 3.3 Admin Calendar
- [ ] Go to **Admin → Calendar**
- [ ] Sarah's events (shoot/edit/publish/report) are visible
- [ ] Can click events to edit them
- [ ] Edit an event — changes save and reflect in calendar

### 3.4 Admin Dashboard Analytics Summary
- [ ] Go to **Admin → Overview**
- [ ] Scroll to "Analytics Overview" section — click to expand
- [ ] Aggregate KPIs (Total Reach, Impressions, etc.) show summed data
- [ ] Per-client table shows Sarah's latest Instagram/Facebook data

---

## Part 4 — Edge Cases & Error States

- [ ] **Login with wrong password** → error message shows (not a blank screen)
- [ ] **Access `/admin` as client** → redirected to `/dashboard`
- [ ] **Access `/dashboard` as admin** → redirected to `/admin`
- [ ] **Proposal with no PDF** → "Generate PDF" button shows (not broken/missing)
- [ ] **Analytics page without access** → redirected to `/dashboard` (not 404)
- [ ] **Empty states**: new client with no data → dashboard shows 0s, not errors
- [ ] **Mobile view**: sidebar collapses to bottom nav, all pages usable on mobile

---

## Part 5 — Meta / OAuth (Production only)

- [ ] In client analytics tab, click "Configure Meta" → Facebook OAuth note shows (localhost warning in dev)
- [ ] **On production**: Facebook Login button redirects to Meta OAuth
- [ ] After authorising, Meta page picker modal appears
- [ ] Select page → analytics sync button appears → "Sync Meta" pulls live data

---

## Part 6 — Cron & Background Jobs (Staging/Prod only)

- [ ] **Trigger generate-reports cron** manually:
  ```bash
  curl https://portal.lensandlaunch.com/api/cron/generate-reports \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
  → Response: reports due today are listed (or "No reports due today")

- [ ] **Trigger send-reminders cron** manually:
  ```bash
  curl https://portal.lensandlaunch.com/api/cron/send-reminders \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
  → Response: any pending reminders sent, marked as sent in DB

---

## Pre-Deploy Final Checks

- [ ] Run migration `022_esig_onboarding.sql` in Supabase SQL editor
- [ ] All previous migrations (001–021) confirmed run
- [ ] `RESEND_API_KEY` set in Vercel environment variables
- [ ] `CRON_SECRET` set in Vercel environment variables
- [ ] `ANTHROPIC_API_KEY` set in Vercel environment variables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (for seed script)
- [ ] `NEXT_PUBLIC_APP_URL` set to `https://portal.lensandlaunch.com`
- [ ] `NEXT_PUBLIC_HUBSPOT_MEETING_URL` set to the general booking URL
- [ ] Supabase Storage buckets exist: `proposals`, `brand-assets`, `client-assets`
- [ ] Vercel crons configured in `vercel.json` ✓
- [ ] Custom domain DNS pointing to Vercel ✓
- [ ] No console errors in browser dev tools on any page
- [ ] No hydration warnings in browser console

---

*Generated: 2026-02-25 · Lens & Launch Portal*
