-- ─── Lens & Launch Media — Portal Schema ─────────────────────────────────────

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  role          text not null default 'client' check (role in ('admin', 'client')),
  full_name     text not null default '',
  business_name text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Projects ────────────────────────────────────────────────────────────────
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references profiles(id) on delete cascade,
  name         text not null,
  description  text,
  service_type text not null default 'retainer'
    check (service_type in ('photography', 'videography', 'content_strategy', 'retainer')),
  status       text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  start_date   date,
  created_at   timestamptz not null default now()
);

-- ─── Invoices ────────────────────────────────────────────────────────────────
create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  client_id      uuid not null references profiles(id) on delete cascade,
  invoice_number text not null,
  amount         numeric(10,2) not null,
  due_date       date not null,
  status         text not null default 'pending'
    check (status in ('pending', 'paid', 'overdue')),
  line_items     jsonb not null default '[]',
  notes          text,
  created_at     timestamptz not null default now()
);

-- ─── Deliverables ────────────────────────────────────────────────────────────
create table if not exists deliverables (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        date,
  client_approved boolean not null default false,
  agency_approved boolean not null default false,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- ─── Calendar Events ─────────────────────────────────────────────────────────
create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  start_date  timestamptz not null,
  end_date    timestamptz,
  type        text not null default 'meeting'
    check (type in ('shoot', 'edit', 'review', 'publish', 'meeting')),
  notes       text,
  color       text
);

-- ─── Proposals ───────────────────────────────────────────────────────────────
create table if not exists proposals (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references profiles(id) on delete cascade,
  title      text not null,
  content    jsonb not null default '[]',
  status     text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined')),
  pdf_url    text,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_projects_client_id    on projects(client_id);
create index if not exists idx_invoices_client_id    on invoices(client_id);
create index if not exists idx_deliverables_project  on deliverables(project_id);
create index if not exists idx_calendar_project      on calendar_events(project_id);
create index if not exists idx_proposals_client_id   on proposals(client_id);
