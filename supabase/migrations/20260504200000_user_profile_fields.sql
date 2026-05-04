alter table public.users
  add column if not exists job_title text not null default '',
  add column if not exists years_experience smallint,
  add column if not exists department text not null default '',
  add column if not exists bio text not null default '';

alter table public.users drop constraint if exists users_years_experience_range;

alter table public.users add constraint users_years_experience_range check (
    years_experience is null or (years_experience >= 0 and years_experience <= 60)
  );
