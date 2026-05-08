import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { HrReviewPanel } from "@/components/reviews/hr-review-panel";
import { ManagerRemarksForm } from "@/components/reviews/manager-remarks-form";
import { buttonVariants } from "@/components/ui/button";
import { getOrgAccess } from "@/lib/org-context";
import { normalizePlan } from "@/lib/plans";
import { definitionForCyclePresetAndPlan } from "@/lib/reviews/preset-review-templates";
import { normalizeWorkflowStatus } from "@/lib/reviews/workflow-status";
import type {
  EmployeeSelfReviewRow,
  EmployeeRow,
  ReviewCycleRow,
  ReviewManagerRemarksRow,
} from "@/types/database";

type PageProps = Readonly<{
  params: Promise<{ cycleId: string; employeeId: string }>;
}>;

export default async function ManagerRemarksPage({
  params,
}: PageProps): Promise<ReactElement | null> {
  const { cycleId, employeeId } = await params;
  const access = await getOrgAccess();
  if (!access) return null;

  const canReview = access.role === "manager" || access.role === "tl";
  const showHrPanel = access.role === "admin" || access.role === "hr";

  const { data: authUser } = await access.supabase.auth.getUser();

  const [cycleRes, empRes, srRes] = await Promise.all([
    access.supabase
      .from("review_cycles")
      .select("*")
      .eq("id", cycleId)
      .eq("org_id", access.orgId)
      .maybeSingle(),
    access.supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .eq("org_id", access.orgId)
      .maybeSingle(),
    access.supabase
      .from("employee_self_reviews")
      .select("*")
      .eq("review_cycle_id", cycleId)
      .eq("employee_id", employeeId)
      .eq("org_id", access.orgId)
      .maybeSingle(),
  ]);

  if (cycleRes.error || !cycleRes.data) notFound();
  if (empRes.error || !empRes.data) notFound();

  const cycle = cycleRes.data as ReviewCycleRow;
  const employee = empRes.data as EmployeeRow;
  const selfReview = srRes.data as EmployeeSelfReviewRow | null;

  const { data: orgRow } = await access.supabase
    .from("organizations")
    .select("plan")
    .eq("id", access.orgId)
    .maybeSingle();
  const templateDefinition = definitionForCyclePresetAndPlan(
    cycle.self_review_template_preset,
    orgRow?.plan as string | null | undefined,
  );

  let remarksRows: ReviewManagerRemarksRow[] = [];
  if (selfReview) {
    const { data: raw } = await access.supabase
      .from("review_manager_remarks")
      .select("*")
      .eq("self_review_id", selfReview.id)
      .eq("org_id", access.orgId);
    remarksRows = (raw ?? []) as ReviewManagerRemarksRow[];
  }

  const uid = authUser.user?.id;
  const lineRole = access.role === "manager" || access.role === "tl";

  const priority = (r: ReviewManagerRemarksRow) =>
    r.status === "approved" ? 3 : r.status === "submitted" ? 2 : 1;

  function sortRemarkRows(rows: ReviewManagerRemarksRow[]) {
    return [...rows].sort(
      (a, b) =>
        priority(b) - priority(a) ||
        String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
    );
  }

  let displayRemark: ReviewManagerRemarksRow | null = null;
  if (lineRole && uid) {
    displayRemark = remarksRows.find((r) => r.manager_user_id === uid) ?? null;
  } else {
    displayRemark = remarksRows.length ? sortRemarkRows(remarksRows)[0] ?? null : null;
  }

  const submittedPacket =
    remarksRows
      .filter((r) => r.status === "submitted")
      .sort((a, b) =>
        String(b.submitted_at ?? b.updated_at ?? "").localeCompare(
          String(a.submitted_at ?? a.updated_at ?? ""),
        ),
      )[0] ?? null;

  const wf = normalizeWorkflowStatus(selfReview);

  return (
    <>
      <DashboardHeader
        title={employee.name}
        description={`Review for ${cycle.title}`}
        actions={
          <Link
            href={`/reviews/${cycleId}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}
          >
            <ArrowLeftIcon className="size-4" />
            Back to cycle
          </Link>
        }
      />

      <main className="flex-1 overflow-x-auto p-6 space-y-6">
        <ManagerRemarksForm
          cycle={cycle}
          employee={employee}
          selfReview={selfReview}
          templateDefinition={templateDefinition}
          existingRemarks={displayRemark}
          canReview={canReview}
          workflowStatus={wf}
          hrRejectionReason={selfReview?.hr_rejection_reason ?? null}
        />

        {showHrPanel &&
          selfReview &&
          (wf === "hr_review_pending" || wf === "finalized") && (
          <div className="mx-auto max-w-5xl">
            <HrReviewPanel
              selfReviewId={selfReview.id}
              remarksId={wf === "hr_review_pending" ? submittedPacket?.id ?? null : null}
              workflowStatus={wf}
              defaultHrRemarks={selfReview.hr_remarks ?? ""}
              finalizedAt={selfReview.finalized_at ?? null}
            />
          </div>
        )}
      </main>
    </>
  );
}
