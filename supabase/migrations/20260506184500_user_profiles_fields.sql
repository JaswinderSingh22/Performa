-- Move user profile fields from legacy public.users to public.user_profiles.

alter table public.user_profiles
  add column if not exists job_title text not null default '',
  add column if not exists years_experience numeric(4,1),
  add column if not exists department text not null default '',
  add column if not exists bio text not null default '';

alter table public.user_profiles drop constraint if exists user_profiles_years_experience_range;
alter table public.user_profiles add constraint user_profiles_years_experience_range check (
  years_experience is null or (years_experience >= 0 and years_experience <= 60)
);

-- Best-effort backfill from legacy public.users if columns exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='job_title'
  ) then
    update public.user_profiles p
    set
      job_title = u.job_title,
      years_experience = u.years_experience,
      department = u.department,
      bio = u.bio
    from public.users u
    where u.id = p.user_id;
  end if;
end $$;

