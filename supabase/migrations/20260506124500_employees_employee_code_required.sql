-- Enforce employee_code presence for new/updated rows without breaking existing data.
-- NOT VALID means existing rows aren't checked, but future writes are enforced.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_employee_code_required'
  ) then
    alter table public.employees
      add constraint employees_employee_code_required
      check (employee_code is not null and employee_code <> '')
      not valid;
  end if;
end $$;

