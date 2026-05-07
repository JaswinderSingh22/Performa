-- Review cycles: one per org per cadence period
CREATE TABLE public.review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  cadence text NOT NULL CHECK (cadence IN ('monthly', 'quarterly', 'mid_year', 'yearly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  self_review_due date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'reviewing', 'closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_cycles_org_id_idx ON public.review_cycles (org_id);

-- Employee self-reviews: one per employee per cycle
CREATE TABLE public.employee_self_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_cycle_id uuid NOT NULL REFERENCES public.review_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  highlights text NOT NULL DEFAULT '',
  challenges text NOT NULL DEFAULT '',
  goals_next_period text NOT NULL DEFAULT '',
  collaboration_note text NOT NULL DEFAULT '',
  growth_areas text NOT NULL DEFAULT '',
  support_needed text NOT NULL DEFAULT '',
  self_rating smallint CHECK (self_rating BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'late')),
  submitted_at timestamptz,
  form_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_cycle_id, employee_id)
);

CREATE INDEX esr_cycle_id_idx ON public.employee_self_reviews (review_cycle_id);
CREATE INDEX esr_employee_id_idx ON public.employee_self_reviews (employee_id);
CREATE INDEX esr_org_id_idx ON public.employee_self_reviews (org_id);
CREATE INDEX esr_form_token_idx ON public.employee_self_reviews (form_token);

-- Manager remarks: manager annotates each section and approves
CREATE TABLE public.review_manager_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  self_review_id uuid NOT NULL REFERENCES public.employee_self_reviews(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  review_cycle_id uuid NOT NULL REFERENCES public.review_cycles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  highlights_remark text NOT NULL DEFAULT '',
  challenges_remark text NOT NULL DEFAULT '',
  goals_remark text NOT NULL DEFAULT '',
  growth_remark text NOT NULL DEFAULT '',
  final_remark text NOT NULL DEFAULT '',
  overall_rating smallint CHECK (overall_rating BETWEEN 1 AND 5),
  ai_suggested_summary text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'archived')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (self_review_id, manager_user_id)
);

CREATE INDEX rmr_self_review_id_idx ON public.review_manager_remarks (self_review_id);
CREATE INDEX rmr_cycle_id_idx ON public.review_manager_remarks (review_cycle_id);
CREATE INDEX rmr_org_id_idx ON public.review_manager_remarks (org_id);

-- RLS
ALTER TABLE public.review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_self_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_manager_remarks ENABLE ROW LEVEL SECURITY;

-- review_cycles policies
CREATE POLICY review_cycles_select ON public.review_cycles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = review_cycles.org_id
  ));

CREATE POLICY review_cycles_insert ON public.review_cycles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = review_cycles.org_id
      AND wm.role IN ('admin', 'hr')
  ));

CREATE POLICY review_cycles_update ON public.review_cycles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = review_cycles.org_id
      AND wm.role IN ('admin', 'hr')
  ));

CREATE POLICY review_cycles_delete ON public.review_cycles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = review_cycles.org_id
      AND wm.role IN ('admin', 'hr')
  ));

-- employee_self_reviews policies
CREATE POLICY esr_select ON public.employee_self_reviews FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = employee_self_reviews.org_id
  ));

CREATE POLICY esr_insert ON public.employee_self_reviews FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = employee_self_reviews.org_id
      AND wm.role IN ('admin', 'hr')
  ));

CREATE POLICY esr_update ON public.employee_self_reviews FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = employee_self_reviews.org_id
  ));

-- review_manager_remarks policies
CREATE POLICY rmr_select ON public.review_manager_remarks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = review_manager_remarks.org_id
  ));

CREATE POLICY rmr_insert ON public.review_manager_remarks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = review_manager_remarks.org_id
      AND wm.role IN ('admin', 'hr', 'manager', 'tl')
  ));

CREATE POLICY rmr_update ON public.review_manager_remarks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.org_id = review_manager_remarks.org_id
      AND wm.role IN ('admin', 'hr', 'manager', 'tl')
  ));
