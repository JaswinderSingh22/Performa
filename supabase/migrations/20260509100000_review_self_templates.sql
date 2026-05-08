-- Department-scoped review self-report templates + cycle department scope.

CREATE TABLE IF NOT EXISTS public.review_self_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  department_id uuid NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Workspace default',
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS review_self_templates_org_default_uidx ON public.review_self_templates (
  org_id
)
WHERE department_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_self_templates_org_dept_uidx ON public.review_self_templates (
  org_id,
  department_id
)
WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS review_self_templates_org_id_idx ON public.review_self_templates (org_id);

ALTER TABLE public.review_cycles ADD COLUMN IF NOT EXISTS scoped_department_ids uuid[];

COMMENT ON COLUMN public.review_cycles.scoped_department_ids IS
  'Optional filter when opening cycle: union with team scope — employees in these departments match by employees.department name.';

COMMENT ON COLUMN public.review_self_templates.department_id IS
  'NULL = organization default fallback template; UUID = overrides for employees in this department on Pro+.';

COMMENT ON COLUMN public.review_self_templates.definition IS
  'JSON schema: { version, sections: [{ key, title?, description?, placeholder?, hidden?, required? }], show_self_rating?, … }';

ALTER TABLE public.employee_self_reviews
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.review_self_templates (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employee_self_reviews_template_id_idx ON public.employee_self_reviews (template_id);

ALTER TABLE public.review_self_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS review_self_templates_select ON public.review_self_templates;
CREATE POLICY review_self_templates_select ON public.review_self_templates FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid ()
        AND wm.org_id = review_self_templates.org_id
    )
  );

DROP POLICY IF EXISTS review_self_templates_modify ON public.review_self_templates;
CREATE POLICY review_self_templates_modify ON public.review_self_templates FOR ALL
USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid ()
        AND wm.org_id = review_self_templates.org_id
        AND wm.role IN ('admin', 'hr')
    )
  )
WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid ()
        AND wm.org_id = review_self_templates.org_id
        AND wm.role IN ('admin', 'hr')
    )
  );
