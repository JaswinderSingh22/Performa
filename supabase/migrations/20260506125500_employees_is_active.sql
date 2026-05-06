-- Track resigned / inactive employees without deleting rows.

alter table public.employees
  add column if not exists is_active boolean not null default true;

create index if not exists employees_org_is_active_idx
  on public.employees (org_id, is_active);

