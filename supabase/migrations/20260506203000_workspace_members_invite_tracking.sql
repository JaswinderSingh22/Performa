-- Track invites + ensure 1:1 employee<->membership mapping per workspace.

alter table public.workspace_members
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references auth.users (id) on delete set null,
  add column if not exists joined_at timestamptz;

-- One employee record should map to at most one login in a workspace.
create unique index if not exists workspace_members_org_employee_unique
  on public.workspace_members (org_id, employee_id)
  where employee_id is not null;

