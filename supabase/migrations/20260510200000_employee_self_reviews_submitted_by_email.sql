-- Snapshot of employee work email at self-review submission (audit / tracking).

ALTER TABLE public.employee_self_reviews
ADD COLUMN IF NOT EXISTS submitted_by_email text;

COMMENT ON COLUMN public.employee_self_reviews.submitted_by_email IS
  'Normalized work email copied from employees.email when the employee submits their self-review.';
