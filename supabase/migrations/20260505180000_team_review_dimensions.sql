-- Team per employee; structured review dimensions (area analysis + per-area ratings).

alter table public.employees
  add column if not exists team_name text not null default '';

comment on column public.employees.team_name is
  'Squad or team label for filtering and review context.';

create table public.review_dimensions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  label text not null,
  analysis text not null default '',
  rating smallint not null check (rating >= 1 and rating <= 5),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index review_dimensions_review_id_idx
  on public.review_dimensions (review_id);

create index review_dimensions_org_id_idx
  on public.review_dimensions (org_id);

alter table public.review_dimensions enable row level security;

create policy review_dimensions_all_org
on public.review_dimensions for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = review_dimensions.org_id
  )
) with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = review_dimensions.org_id
  )
);

comment on table public.review_dimensions is
  'Per-review performance areas: qualitative analysis and 1–5 rating; overall review.rating is derived from these when any exist.';
