-- Let members mark themselves as "joined" once they have a session; RLS blocks direct updates on workspace_members.

create or replace function public.mark_own_workspace_joined(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.workspace_members wm
    where wm.org_id = p_org_id and wm.user_id = auth.uid()
  ) then
    raise exception 'not a member of this workspace';
  end if;

  update public.workspace_members
  set joined_at = now()
  where org_id = p_org_id
    and user_id = auth.uid()
    and joined_at is null;
end;
$$;

comment on function public.mark_own_workspace_joined(uuid) is
  'Authenticated user: sets joined_at on own membership once (used after first sign-in to the workspace).';

revoke all on function public.mark_own_workspace_joined(uuid) from public;
grant execute on function public.mark_own_workspace_joined(uuid) to authenticated;
