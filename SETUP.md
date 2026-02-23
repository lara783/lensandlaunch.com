# Lens & Launch Portal — Setup Guide

## 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. In the SQL editor, run both migration files in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
3. In Storage, create a bucket named **`proposals`** (set to public)
4. Copy your project URL and anon key from **Project Settings → API**

## 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_HUBSPOT_MEETING_URL=https://meetings.hubspot.com/YOUR_LINK
```

## 3. Create your admin account

1. Run the app locally: `npm run dev`
2. Go to Supabase **Authentication → Users → Invite user** — create your account
3. In the SQL editor, set your role to admin:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```
4. Log in at `http://localhost:3000/login`

## 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).

Add the 4 environment variables in Vercel dashboard → Settings → Environment Variables.

### Custom domain

In Vercel → Your project → Settings → Domains:
- Add `portal.lensandlaunch.com`
- Add CNAME record in your DNS: `portal` → `cname.vercel-dns.com`

## 6. HubSpot meeting link

Get your HubSpot meeting URL from:
HubSpot → Sales → Meetings → your meeting link → Share

Format: `https://meetings.hubspot.com/YOUR_USERNAME`

Add it to your `.env.local` as `NEXT_PUBLIC_HUBSPOT_MEETING_URL`.
