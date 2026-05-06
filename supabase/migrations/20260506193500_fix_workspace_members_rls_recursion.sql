-- Fix infinite recursion in RLS policies for public.workspace_members.
-- Policies must not query workspace_members directly (causes recursive policy evaluation).
-- Use SECURITY DEFINER helper functions instead.

create schema if not exists private;

-- Return org ids for the current authenticated user (bypasses RLS).
create or replace function private.my_workspace_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select wm.org_id
  from public.workspace_members wm
  where wm.user_id = auth.uid();
$$;

revoke all on function private.my_workspace_org_ids() from public;
grant execute on function private.my_workspace_org_ids() to authenticated;
grant execute on function private.my_workspace_org_ids() to service_role;

-- Whether the current user shares any workspace with a given user id.
create or replace function private.shares_workspace_with(p_other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them
      on them.org_id = me.org_id
    where me.user_id = auth.uid()
      and them.user_id = p_other_user_id
  );
$$;

revoke all on function private.shares_workspace_with(uuid) from public;
grant execute on function private.shares_workspace_with(uuid) to authenticated;
grant execute on function private.shares_workspace_with(uuid) to service_role;

-- Replace the problematic policy on workspace_members.
drop policy if exists workspace_members_select_org on public.workspace_members;
create policy workspace_members_select_org
on public.workspace_members for select
to authenticated
using (
  -- Always allow reading own memberships, and memberships within any org you're a member of.
  org_id in (select private.my_workspace_org_ids())
);

-- Update user_profiles org-read policy to avoid joining workspace_members in-policy.
drop policy if exists user_profiles_select_org on public.user_profiles;
create policy user_profiles_select_org
on public.user_profiles for select
to authenticated
using (
  user_id = auth.uid()
  or private.shares_workspace_with(user_profiles.user_id)
);

