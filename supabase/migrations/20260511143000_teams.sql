-- Workspace teams are org-level buckets; employees are assigned by team_name.
-- This table stores canonical team names so they can exist without employees.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists teams_org_id_idx on public.teams (org_id);

alter table public.teams enable row level security;

drop policy if exists teams_select_org on public.teams;
drop policy if exists teams_admin_insert on public.teams;
drop policy if exists teams_admin_update on public.teams;
drop policy if exists teams_admin_delete on public.teams;

create policy teams_select_org
on public.teams for select
using (org_id is not distinct from private.user_org_id());

create policy teams_admin_insert
on public.teams for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = teams.org_id
      and u.role = 'admin'
  )
);

create policy teams_admin_update
on public.teams for update
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = teams.org_id
      and u.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = teams.org_id
      and u.role = 'admin'
  )
);

create policy teams_admin_delete
on public.teams for delete
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = teams.org_id
      and u.role = 'admin'
  )
);
