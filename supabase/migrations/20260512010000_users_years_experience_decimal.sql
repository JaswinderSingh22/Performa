alter table public.users
  drop constraint if exists users_years_experience_range;

alter table public.users
  alter column years_experience type numeric(4,1)
  using (
    case
      when years_experience is null then null
      else years_experience::numeric(4,1)
    end
  );

alter table public.users
  add constraint users_years_experience_range check (
    years_experience is null or (years_experience >= 0 and years_experience <= 60)
  );
