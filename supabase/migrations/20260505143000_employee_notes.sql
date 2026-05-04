-- Multiple manager notes per employee (replaces reliance on employees.notes as a single blob).

create table public.employee_notes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_notes_employee_id_idx on public.employee_notes (employee_id);
create index employee_notes_org_id_idx on public.employee_notes (org_id);

alter table public.employee_notes enable row level security;

create policy employee_notes_all_org
on public.employee_notes for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = employee_notes.org_id
  )
) with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = employee_notes.org_id
  )
);

insert into public.employee_notes (employee_id, org_id, body)
select e.id,
  e.org_id,
  trim(e.notes)
from public.employees e
where e.notes is not null
  and length(trim(e.notes)) > 0;

comment on table public.employee_notes is 'Multiple private manager notes attached to one employee.';
comment on column public.employees.notes is 'Deprecated: preserved for rollback; UI uses employee_notes.';
