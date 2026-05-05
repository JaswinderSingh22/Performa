-- Org-level review cycle defaults controlled by workspace admins.

alter table public.organizations
  add column if not exists review_cadence text default 'quarterly',
  add column if not exists quarter_start_month smallint default 1;

alter table public.organizations
  drop constraint if exists organizations_review_cadence_chk;

alter table public.organizations
  add constraint organizations_review_cadence_chk
  check (
    review_cadence is null
    or review_cadence in ('monthly', 'quarterly', 'mid_year', 'yearly')
  );

alter table public.organizations
  drop constraint if exists organizations_quarter_start_month_chk;

alter table public.organizations
  add constraint organizations_quarter_start_month_chk
  check (
    quarter_start_month is null
    or (quarter_start_month >= 1 and quarter_start_month <= 12)
  );

update public.organizations
set
  review_cadence = coalesce(review_cadence, 'quarterly'),
  quarter_start_month = coalesce(quarter_start_month, 1);
