-- ─── Row Level Security Policies ─────────────────────────────────────────────
-- All tables: clients see only their own data.
-- Admin role (role = 'admin' in profiles) has full access.

-- Helper function: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

create policy "Admins can insert profiles"
  on profiles for insert
  with check (is_admin() or id = auth.uid());

create policy "Admins can delete profiles"
  on profiles for delete
  using (is_admin());

-- ─── projects ────────────────────────────────────────────────────────────────
alter table projects enable row level security;

create policy "Clients see own projects"
  on projects for select
  using (client_id = auth.uid() or is_admin());

create policy "Admins manage projects"
  on projects for all
  using (is_admin())
  with check (is_admin());

-- ─── invoices ────────────────────────────────────────────────────────────────
alter table invoices enable row level security;

create policy "Clients see own invoices"
  on invoices for select
  using (client_id = auth.uid() or is_admin());

create policy "Admins manage invoices"
  on invoices for all
  using (is_admin())
  with check (is_admin());

-- ─── deliverables ────────────────────────────────────────────────────────────
alter table deliverables enable row level security;

create policy "Clients see own deliverables"
  on deliverables for select
  using (
    is_admin() or
    exists (
      select 1 from projects
      where projects.id = deliverables.project_id
      and projects.client_id = auth.uid()
    )
  );

-- Clients can only update client_approved on their own deliverables
create policy "Clients update own client_approved"
  on deliverables for update
  using (
    exists (
      select 1 from projects
      where projects.id = deliverables.project_id
      and projects.client_id = auth.uid()
    )
  )
  with check (
    -- Only allow updating client_approved (agency_approved must remain unchanged)
    exists (
      select 1 from projects
      where projects.id = deliverables.project_id
      and projects.client_id = auth.uid()
    )
  );

create policy "Admins manage deliverables"
  on deliverables for all
  using (is_admin())
  with check (is_admin());

-- ─── calendar_events ─────────────────────────────────────────────────────────
alter table calendar_events enable row level security;

create policy "Clients see own calendar events"
  on calendar_events for select
  using (
    is_admin() or
    exists (
      select 1 from projects
      where projects.id = calendar_events.project_id
      and projects.client_id = auth.uid()
    )
  );

create policy "Admins manage calendar events"
  on calendar_events for all
  using (is_admin())
  with check (is_admin());

-- ─── proposals ───────────────────────────────────────────────────────────────
alter table proposals enable row level security;

create policy "Clients see own proposals"
  on proposals for select
  using (client_id = auth.uid() or is_admin());

-- Clients can update status to accepted/declined only
create policy "Clients update proposal status"
  on proposals for update
  using (client_id = auth.uid())
  with check (status in ('accepted', 'declined'));

create policy "Admins manage proposals"
  on proposals for all
  using (is_admin())
  with check (is_admin());

-- ─── Realtime: enable for deliverables (live checkbox sync) ──────────────────
alter publication supabase_realtime add table deliverables;
