-- Weighted predefined checklist per performance review (drives ratings when criteria are marked met).
alter table public.reviews add column if not exists checklist jsonb not null default '{}'::jsonb;

comment on column public.reviews.checklist is
  'Boolean map keyed by predefined checklist slug; weighted completion maps to ratings.rating alongside dimensions.';
