-- Policies on public.users queried public.users → infinite RLS recursion.
-- Helper runs as SECURITY DEFINER (migration owner bypasses RLS) so lookups are non-recursive.

create schema if not exists private;

create or replace function private.user_org_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.users where id = auth.uid() limit 1;
$$;

revoke all on function private.user_org_id() from public;
grant execute on function private.user_org_id() to authenticated;
grant execute on function private.user_org_id() to service_role;

grant usage on schema private to authenticated;

drop policy if exists users_select_org on public.users;
drop policy if exists users_update_own on public.users;

create policy users_select_org on public.users for select using (
  id = auth.uid()
  or org_id is not distinct from private.user_org_id()
);

create policy users_update_own on public.users for update using (id = auth.uid())
with check (
  id = auth.uid()
  and org_id is not distinct from private.user_org_id()
);
