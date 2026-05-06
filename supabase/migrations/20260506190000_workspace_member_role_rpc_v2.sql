-- Multi-workspace role assignment: scoped by org_id on workspace_members.

create or replace function public.set_workspace_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_old_role text;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if p_role not in ('admin', 'manager') then
    raise exception 'invalid role';
  end if;

  select role into v_old_role
  from public.workspace_members
  where org_id = p_org_id
    and user_id = p_user_id;

  if v_old_role is null then
    raise exception 'member not found';
  end if;

  if not exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = v_actor
      and wm.org_id = p_org_id
      and wm.role = 'admin'
  ) then
    raise exception 'only workspace admins can change roles';
  end if;

  select created_by into v_owner
  from public.organizations
  where id = p_org_id;

  if v_owner is not distinct from p_user_id and p_role <> 'admin' then
    raise exception 'workspace owner must stay Admin';
  end if;

  if v_old_role = 'admin' and p_role = 'manager' then
    if not exists (
      select 1
      from public.workspace_members wm
      where wm.org_id = p_org_id
        and wm.role = 'admin'
        and wm.user_id <> p_user_id
    ) then
      raise exception 'keep at least one Admin in the workspace';
    end if;
  end if;

  update public.workspace_members
  set role = p_role
  where org_id = p_org_id
    and user_id = p_user_id;
end;
$$;

comment on function public.set_workspace_member_role(uuid, uuid, text) is
  'Admin-only: assign workspace member roles per org. Owner stays Admin; at least one Admin remains.';

revoke all on function public.set_workspace_member_role(uuid, uuid, text) from public;
grant execute on function public.set_workspace_member_role(uuid, uuid, text) to authenticated;

