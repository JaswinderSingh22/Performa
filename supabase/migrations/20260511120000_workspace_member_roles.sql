-- Admins assign roles for app users (`public.users`) in the same workspace.
-- Org creator (`organizations.created_by`) must remain Admin.
-- SECURITY DEFINER avoids widening generic UPDATE policies on profiles.

create or replace function public.set_workspace_member_role(
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
  v_target_org uuid;
  v_owner uuid;
  v_old_role text;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if p_role not in ('admin', 'manager') then
    raise exception 'invalid role';
  end if;

  select org_id, role into v_target_org, v_old_role
  from public.users
  where id = p_user_id;

  if v_target_org is null then
    raise exception 'member not found';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_actor
      and u.org_id = v_target_org
      and u.role = 'admin'
  ) then
    raise exception 'only workspace admins can change roles';
  end if;

  select created_by into v_owner
  from public.organizations
  where id = v_target_org;

  if v_owner is not distinct from p_user_id and p_role <> 'admin' then
    raise exception 'workspace owner must stay Admin';
  end if;

  if v_old_role = 'admin' and p_role = 'manager' then
    if not exists (
      select 1
      from public.users u
      where u.org_id = v_target_org
        and u.role = 'admin'
        and u.id <> p_user_id
    ) then
      raise exception 'keep at least one Admin in the workspace';
    end if;
  end if;

  update public.users
  set role = p_role
  where id = p_user_id
    and org_id = v_target_org;
end;
$$;

comment on function public.set_workspace_member_role(uuid, text) is
  'Admin-only: assign app user roles. Owner stays Admin; at least one Admin remains.';

revoke all on function public.set_workspace_member_role(uuid, text) from public;
grant execute on function public.set_workspace_member_role(uuid, text) to authenticated;
