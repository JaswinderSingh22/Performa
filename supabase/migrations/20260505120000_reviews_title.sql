alter table public.reviews
add column if not exists title text not null default 'Performance review';

comment on column public.reviews.title is
  'Label for this review cycle (period, focal, mid-year).';
