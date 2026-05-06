-- Add employee_code (company-facing Employee ID) and reporting_to_employee_id
-- (self-referential manager link) to public.employees.

alter table public.employees
  add column if not exists employee_code text,
  add column if not exists reporting_to_employee_id uuid;

-- Self reference: if manager is deleted, clear report-to.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_reporting_to_employee_id_fkey'
  ) then
    alter table public.employees
      add constraint employees_reporting_to_employee_id_fkey
      foreign key (reporting_to_employee_id)
      references public.employees(id)
      on delete set null;
  end if;
end $$;

-- Employee ID should be unique per org when provided.
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'employees_org_employee_code_key'
  ) then
    create unique index employees_org_employee_code_key
      on public.employees (org_id, employee_code)
      where employee_code is not null and employee_code <> '';
  end if;
end $$;

create index if not exists employees_reporting_to_employee_id_idx
  on public.employees (reporting_to_employee_id);

