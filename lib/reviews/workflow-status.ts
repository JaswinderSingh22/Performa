import type { EmployeeSelfReviewRow, ReviewWorkflowStatus } from "@/types/database";

export function normalizeWorkflowStatus(
  sr: Pick<EmployeeSelfReviewRow, "status" | "workflow_status"> | null,
): ReviewWorkflowStatus {
  if (!sr) return "draft";
  const w = sr.workflow_status as ReviewWorkflowStatus | null | undefined;
  if (
    w === "draft" ||
    w === "employee_submitted" ||
    w === "hr_review_pending" ||
    w === "revision_requested" ||
    w === "finalized"
  ) {
    return w;
  }
  return sr.status === "submitted" || sr.status === "late"
    ? "employee_submitted"
    : "draft";
}
