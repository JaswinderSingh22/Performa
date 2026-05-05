-- Canonical department list at org level; employees reference by department name.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists departments_org_id_idx on public.departments (org_id);

alter table public.departments enable row level security;

drop policy if exists departments_select_org on public.departments;
drop policy if exists departments_admin_insert on public.departments;
drop policy if exists departments_admin_update on public.departments;
drop policy if exists departments_admin_delete on public.departments;

create policy departments_select_org
on public.departments for select
using (org_id is not distinct from private.user_org_id());

create policy departments_admin_insert
on public.departments for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = departments.org_id
      and u.role = 'admin'
  )
);

create policy departments_admin_update
on public.departments for update
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = departments.org_id
      and u.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = departments.org_id
      and u.role = 'admin'
  )
);

create policy departments_admin_delete
on public.departments for delete
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = departments.org_id
      and u.role = 'admin'
  )
);
