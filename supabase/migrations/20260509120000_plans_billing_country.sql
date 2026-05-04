-- Billing plans metadata, manager country, Razorpay linkage, AI usage tracking

alter table public.organizations
  add column if not exists country_code text not null default 'IN',
  add column if not exists billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'year')),
  add column if not exists subscription_status text not null default 'none',
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text,
  add column if not exists subscription_current_end timestamptz;

alter table public.organizations
  drop constraint if exists organizations_plan_check;

alter table public.organizations
  add constraint organizations_plan_check
    check (plan in ('free', 'pro', 'pro_plus'));

comment on column public.organizations.country_code is 'ISO 3166-1 alpha-2 (manager country at onboarding)';
comment on column public.organizations.subscription_status is 'Subscription lifecycle (Razorpay-aligned); none for free tier';

create table if not exists public.employee_ai_generation_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  month_key text not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  unique (employee_id, month_key)
);

create index if not exists employee_ai_usage_org_month_idx
  on public.employee_ai_generation_usage (org_id, month_key);

alter table public.employee_ai_generation_usage enable row level security;

create policy employee_ai_usage_org_all
on public.employee_ai_generation_usage for all
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = employee_ai_generation_usage.org_id
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = employee_ai_generation_usage.org_id
  )
);
