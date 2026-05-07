-- Optional team scope: when non-null, opening a cycle only adds employees in those teams (by employees.team_name).
alter table public.review_cycles
  add column if not exists scoped_team_names text[];

comment on column public.review_cycles.scoped_team_names is
  'Null = include all active employees when opening the cycle; non-empty array = only employees whose team_name matches list (canonical team names).';
