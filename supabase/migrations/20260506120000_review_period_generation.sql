-- Period-scoped review generation + stitching prior quarter reviews (token savings)

alter table public.reviews
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists source_review_ids uuid[] default null,
  add column if not exists generation_strategy text;

alter table public.reviews drop constraint if exists reviews_generation_strategy_chk;
alter table public.reviews add constraint reviews_generation_strategy_chk
  check (
    generation_strategy is null
    or generation_strategy in ('raw_period', 'stitched_summaries')
  );

alter table public.reviews drop constraint if exists reviews_period_bounds_chk;
alter table public.reviews add constraint reviews_period_bounds_chk
  check (
    (period_start is null and period_end is null)
    or (period_start is not null and period_end is not null and period_end >= period_start)
  );
