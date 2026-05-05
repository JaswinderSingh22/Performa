-- Department-level review cycle + team-to-department ownership.

alter table public.departments
  add column if not exists review_cadence text default 'quarterly',
  add column if not exists quarter_start_month smallint default 1;

alter table public.departments
  drop constraint if exists departments_review_cadence_chk;

alter table public.departments
  add constraint departments_review_cadence_chk
  check (
    review_cadence is null
    or review_cadence in ('monthly', 'quarterly', 'mid_year', 'yearly')
  );

alter table public.departments
  drop constraint if exists departments_quarter_start_month_chk;

alter table public.departments
  add constraint departments_quarter_start_month_chk
  check (
    quarter_start_month is null
    or (quarter_start_month >= 1 and quarter_start_month <= 12)
  );

alter table public.teams
  add column if not exists department_id uuid references public.departments (id) on delete restrict;

insert into public.departments (org_id, name)
select distinct t.org_id, 'General'
from public.teams t
where not exists (
  select 1 from public.departments d
  where d.org_id = t.org_id
    and lower(d.name) = 'general'
);

update public.teams t
set department_id = d.id
from public.departments d
where t.department_id is null
  and d.org_id = t.org_id
  and lower(d.name) = 'general';

alter table public.teams
  alter column department_id set not null;

create index if not exists teams_department_id_idx on public.teams (department_id);
