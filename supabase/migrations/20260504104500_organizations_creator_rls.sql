-- Onboarding INSERT ... RETURNING must read the new row before public.users exists.
-- Link org creator to auth.users so SELECT RLS passes for that row immediately.

alter table public.organizations
add column if not exists created_by uuid references auth.users (id) on delete set null;

comment on column public.organizations.created_by is
  'Auth user who created this org — used for bootstrap SELECT before app profile rows exist';

drop policy if exists organizations_insert_authenticated on public.organizations;
drop policy if exists organizations_select_own on public.organizations;

create policy organizations_select_visible
on public.organizations for select
using (
  created_by is not distinct from auth.uid()
  or exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = organizations.id
  )
);

create policy organizations_insert_creator
on public.organizations for insert to authenticated
with check (
  created_by is not distinct from auth.uid()
);
