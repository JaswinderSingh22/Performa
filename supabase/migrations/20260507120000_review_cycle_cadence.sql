-- Review cycle cadence (monthly / quarterly / mid-year / yearly) + slot keys for reminders

alter table public.employees
  add column if not exists review_cadence text default 'quarterly';

alter table public.employees drop constraint if exists employees_review_cadence_chk;
alter table public.employees add constraint employees_review_cadence_chk
  check (
    review_cadence is null
    or review_cadence in ('monthly', 'quarterly', 'mid_year', 'yearly')
  );

update public.employees
set review_cadence = 'quarterly'
where review_cadence is null;

alter table public.reviews
  add column if not exists review_cadence text,
  add column if not exists period_key text;

alter table public.reviews drop constraint if exists reviews_review_cadence_chk;
alter table public.reviews add constraint reviews_review_cadence_chk
  check (
    review_cadence is null
    or review_cadence in ('monthly', 'quarterly', 'mid_year', 'yearly')
  );

create index if not exists reviews_employee_period_slot_idx
  on public.reviews (employee_id, review_cadence, period_key)
  where period_key is not null;
