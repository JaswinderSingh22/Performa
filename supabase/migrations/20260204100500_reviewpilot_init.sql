-- ReviewPilot Phase 1 schema (PostgreSQL + Supabase Auth + RLS)
-- Login/onboarding wired later; profiles link app users to orgs via auth.uid().

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- App profile: id matches auth.users.id
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'manager')),
  created_at timestamptz not null default now()
);

create index users_org_id_idx on public.users (org_id);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default '',
  department text not null default '',
  join_date date,
  notes text,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create index employees_org_id_idx on public.employees (org_id);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'general',
  achievement_date date,
  created_at timestamptz not null default now()
);

create index achievements_employee_id_idx on public.achievements (employee_id);
create index achievements_org_id_idx on public.achievements (org_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  ai_draft text,
  final_review text,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create index reviews_employee_id_idx on public.reviews (employee_id);
create index reviews_org_id_idx on public.reviews (org_id);

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.employees enable row level security;
alter table public.achievements enable row level security;
alter table public.reviews enable row level security;

create policy organizations_select_own
on public.organizations for select using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = organizations.id
  )
);

create policy organizations_insert_authenticated
on public.organizations for insert to authenticated with check (true);

create policy organizations_update_admins
on public.organizations for update using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = organizations.id
      and u.role = 'admin'
  )
);

-- App users rows: readable for same org members; writable for self or org admins where relevant
create policy users_select_org
on public.users for select using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = users.org_id
  )
);

create policy users_insert_own
on public.users for insert to authenticated with check (id = auth.uid());

create policy users_update_own
on public.users for update using (id = auth.uid()) with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = users.org_id
  )
);

create policy employees_all_org
on public.employees for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = employees.org_id
  )
) with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = employees.org_id
  )
);

create policy achievements_all_org
on public.achievements for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = achievements.org_id
  )
) with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = achievements.org_id
  )
);

create policy reviews_all_org
on public.reviews for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = reviews.org_id
  )
) with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.org_id = reviews.org_id
  )
);

