-- Linear review workflow on employee_self_reviews + HR gate + immutability after finalize.

ALTER TABLE public.employee_self_reviews
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN (
      'draft',
      'employee_submitted',
      'hr_review_pending',
      'revision_requested',
      'finalized'
    )),
  ADD COLUMN IF NOT EXISTS hr_remarks text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hr_rejection_reason text,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.employee_self_reviews.workflow_status IS
  'Pipeline: draft → employee_submitted → hr_review_pending → finalized; revision_requested when HR sends back.';

-- Backfill from existing self-review + manager remark rows
UPDATE public.employee_self_reviews
SET workflow_status = 'draft'
WHERE status = 'pending';

UPDATE public.employee_self_reviews esr
SET workflow_status = 'employee_submitted'
WHERE esr.status IN ('submitted', 'late')
  AND NOT EXISTS (
    SELECT 1 FROM public.review_manager_remarks r
    WHERE r.self_review_id = esr.id
      AND r.status IN ('submitted', 'approved')
  );

UPDATE public.employee_self_reviews esr
SET workflow_status = 'hr_review_pending'
WHERE esr.status IN ('submitted', 'late')
  AND EXISTS (
    SELECT 1 FROM public.review_manager_remarks r
    WHERE r.self_review_id = esr.id
      AND r.status = 'submitted'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.review_manager_remarks r
    WHERE r.self_review_id = esr.id
      AND r.status = 'approved'
  );

UPDATE public.employee_self_reviews esr
SET workflow_status = 'finalized',
    finalized_at = r.approved_at,
    finalized_by = r.approved_by
FROM (
  SELECT DISTINCT ON (self_review_id)
    self_review_id,
    approved_at,
    approved_by
  FROM public.review_manager_remarks
  WHERE status = 'approved'
  ORDER BY self_review_id, approved_at DESC NULLS LAST
) AS r
WHERE esr.id = r.self_review_id;

-- Immutability: finalized employee_self_reviews rows cannot change or delete
CREATE OR REPLACE FUNCTION public.prevent_mutation_when_review_finalized()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.workflow_status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized reviews cannot be deleted.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.workflow_status = 'finalized' THEN
    RAISE EXCEPTION 'Finalized reviews cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_self_reviews_prevent_finalize_mutation ON public.employee_self_reviews;
CREATE TRIGGER employee_self_reviews_prevent_finalize_mutation
BEFORE UPDATE OR DELETE ON public.employee_self_reviews
FOR EACH ROW
EXECUTE FUNCTION public.prevent_mutation_when_review_finalized();

CREATE OR REPLACE FUNCTION public.prevent_manager_remarks_when_parent_finalized()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  w text;
BEGIN
  SELECT esr.workflow_status INTO w
  FROM public.employee_self_reviews esr
  WHERE esr.id = COALESCE(NEW.self_review_id, OLD.self_review_id)
  LIMIT 1;

  IF w = 'finalized' THEN
    RAISE EXCEPTION 'Manager remarks cannot be changed after HR finalizes.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS review_manager_remarks_prevent_finalize_mutation ON public.review_manager_remarks;
CREATE TRIGGER review_manager_remarks_prevent_finalize_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.review_manager_remarks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_manager_remarks_when_parent_finalized();
