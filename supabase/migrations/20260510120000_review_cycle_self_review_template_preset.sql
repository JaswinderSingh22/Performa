-- HR/Admin selects a built-in self-review questionnaire preset when creating a cycle.

ALTER TABLE public.review_cycles
ADD COLUMN IF NOT EXISTS self_review_template_preset text NOT NULL DEFAULT 'general';

COMMENT ON COLUMN public.review_cycles.self_review_template_preset IS
  'Built-in questionnaire preset: general | engineering | sales | customer_success | leadership. Free workspaces use general only; validated in app.';

ALTER TABLE public.review_cycles DROP CONSTRAINT IF EXISTS review_cycles_self_review_template_preset_check;

ALTER TABLE public.review_cycles
ADD CONSTRAINT review_cycles_self_review_template_preset_check CHECK (
  self_review_template_preset IN (
    'general',
    'engineering',
    'sales',
    'customer_success',
    'leadership'
  )
);
