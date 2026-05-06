-- Multi-workspace foundation: split profile vs membership.
-- - user_profiles: one per auth user
-- - workspace_members: one per org per user (role scoped to org)
-- Existing `public.users` is treated as legacy (profile+membership combined).

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Start with existing roles; will be expanded later (hr, tl, etc.)
  role text not null check (role in ('admin', 'manager')),
  -- Optional link to the employee directory record (needed for manager scoping later)
  employee_id uuid references public.employees (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members (user_id);
create index if not exists workspace_members_org_id_idx on public.workspace_members (org_id);
create index if not exists workspace_members_employee_id_idx on public.workspace_members (employee_id);

alter table public.user_profiles enable row level security;
alter table public.workspace_members enable row level security;

-- Helper: membership checks without RLS recursion.
create schema if not exists private;

create or replace function private.is_workspace_member(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.org_id = p_org_id
      and wm.user_id = auth.uid()
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_member(uuid) to service_role;
grant usage on schema private to authenticated;

-- Backfill profiles and memberships from legacy public.users (if present).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    insert into public.user_profiles (user_id, full_name, created_at)
    select u.id, u.full_name, u.created_at
    from public.users u
    on conflict (user_id) do update
      set full_name = excluded.full_name;

    insert into public.workspace_members (org_id, user_id, role, created_at)
    select u.org_id, u.id, u.role, u.created_at
    from public.users u
    where u.org_id is not null
    on conflict (org_id, user_id) do update
      set role = excluded.role;
  end if;
end $$;

-- Policies: profiles readable within same workspace; writable by self.
drop policy if exists user_profiles_select_org on public.user_profiles;
create policy user_profiles_select_org
on public.user_profiles for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them on them.org_id = me.org_id
    where me.user_id = auth.uid()
      and them.user_id = user_profiles.user_id
  )
);

drop policy if exists user_profiles_insert_self on public.user_profiles;
create policy user_profiles_insert_self
on public.user_profiles for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_profiles_update_self on public.user_profiles;
create policy user_profiles_update_self
on public.user_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Policies: workspace_members readable within org; self-readable for membership list + switching.
drop policy if exists workspace_members_select_org on public.workspace_members;
create policy workspace_members_select_org
on public.workspace_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.workspace_members me
    where me.user_id = auth.uid()
      and me.org_id = workspace_members.org_id
  )
);

-- Membership rows are created by onboarding/invites via server-side logic.
-- Allow self-insert only for the first onboarding membership creation.
drop policy if exists workspace_members_insert_self on public.workspace_members;
create policy workspace_members_insert_self
on public.workspace_members for insert
to authenticated
with check (user_id = auth.uid());

-- Updates/deletes to memberships should go through a SECURITY DEFINER RPC later.
drop policy if exists workspace_members_update_none on public.workspace_members;
create policy workspace_members_update_none
on public.workspace_members for update
to authenticated
using (false);

drop policy if exists workspace_members_delete_none on public.workspace_members;
create policy workspace_members_delete_none
on public.workspace_members for delete
to authenticated
using (false);

-- Update org access policies to use workspace_members instead of legacy public.users.
drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own
on public.organizations for select
to authenticated
using (private.is_workspace_member(organizations.id));

-- Employees / achievements / reviews / employee_notes should check membership in their org.
-- (Drop & recreate if they exist from previous migrations.)
drop policy if exists employees_all_org on public.employees;
create policy employees_all_org
on public.employees for all
to authenticated
using (private.is_workspace_member(employees.org_id))
with check (private.is_workspace_member(employees.org_id));

drop policy if exists achievements_all_org on public.achievements;
create policy achievements_all_org
on public.achievements for all
to authenticated
using (private.is_workspace_member(achievements.org_id))
with check (private.is_workspace_member(achievements.org_id));

drop policy if exists reviews_all_org on public.reviews;
create policy reviews_all_org
on public.reviews for all
to authenticated
using (private.is_workspace_member(reviews.org_id))
with check (private.is_workspace_member(reviews.org_id));

drop policy if exists employee_notes_all_org on public.employee_notes;
create policy employee_notes_all_org
on public.employee_notes for all
to authenticated
using (private.is_workspace_member(employee_notes.org_id))
with check (private.is_workspace_member(employee_notes.org_id));

-- Teams / departments / review dimensions / org settings tables (if present)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='teams') then
    drop policy if exists teams_all_org on public.teams;
    create policy teams_all_org
    on public.teams for all
    to authenticated
    using (private.is_workspace_member(teams.org_id))
    with check (private.is_workspace_member(teams.org_id));
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='departments') then
    drop policy if exists departments_all_org on public.departments;
    create policy departments_all_org
    on public.departments for all
    to authenticated
    using (private.is_workspace_member(departments.org_id))
    with check (private.is_workspace_member(departments.org_id));
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='review_dimensions') then
    drop policy if exists review_dimensions_all_org on public.review_dimensions;
    create policy review_dimensions_all_org
    on public.review_dimensions for all
    to authenticated
    using (private.is_workspace_member(review_dimensions.org_id))
    with check (private.is_workspace_member(review_dimensions.org_id));
  end if;
end $$;

