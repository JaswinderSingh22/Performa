import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { EmployeeProfileActions } from "@/components/employees/employee-profile-actions";
import {
  EmployeeInsightsView,
  type EmployeeReviewCycleRow,
} from "@/components/employees/employee-insights-view";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { getOrgAccess } from "@/lib/org-context";
import { getEmployeeLockState } from "@/lib/employee-lock";
import type { EmployeeRow } from "@/types/database";
import type { ReviewManagerRemarksRow } from "@/types/database";

type PageProps = Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function rollupRemarkStatus(
  rows: Pick<ReviewManagerRemarksRow, "status">[],
): EmployeeReviewCycleRow["remarkStatus"] {
  if (rows.length === 0) return "none";
  const statuses = rows.map((r) => r.status);
  if (statuses.includes("approved")) return "approved";
  if (statuses.includes("submitted")) return "submitted";
  if (statuses.includes("draft")) return "draft";
  if (statuses.includes("archived")) return "archived";
  return "none";
}

export default async function EmployeeInsightsPage({
  params,
}: PageProps): Promise<ReactElement | null> {
  const { id } = await params;
  const access = await getOrgAccess();
  if (!access) return null;

  const [employeeRes, teamsRes, departmentsRes, accessRes, selfReviewsRes] =
    await Promise.all([
      access.supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .eq("org_id", access.orgId)
        .maybeSingle(),
      access.supabase
        .from("teams")
        .select("id, name")
        .eq("org_id", access.orgId)
        .order("name", { ascending: true }),
      access.supabase
        .from("departments")
        .select("id, name")
        .eq("org_id", access.orgId)
        .order("name", { ascending: true }),
      access.supabase
        .from("workspace_members")
        .select("role, invited_at")
        .eq("org_id", access.orgId)
        .eq("employee_id", id)
        .maybeSingle(),
      access.supabase
        .from("employee_self_reviews")
        .select("id, status, submitted_at, review_cycle_id")
        .eq("employee_id", id)
        .eq("org_id", access.orgId)
        .order("created_at", { ascending: false }),
    ]);

  const { data: employee, error: employeeError } = employeeRes;
  if (employeeError || !employee) {
    notFound();
  }

  const employeeRow = employee as EmployeeRow;
  const lockState = await getEmployeeLockState(access, employeeRow.id);
  const locked = lockState.locked;

  const selfReviews = selfReviewsRes.data ?? [];
  const cycleIds = [...new Set(selfReviews.map((r) => r.review_cycle_id as string))];

  const [cyclesRes, remarksRes] = await Promise.all([
    cycleIds.length > 0
      ? access.supabase
          .from("review_cycles")
          .select("id, title, status, period_start, period_end, self_review_due")
          .in("id", cycleIds)
          .eq("org_id", access.orgId)
      : Promise.resolve({ data: [] as { id: string; title: string; status: string; period_start: string; period_end: string; self_review_due: string | null }[] }),
    selfReviews.length > 0
      ? access.supabase
          .from("review_manager_remarks")
          .select("self_review_id, status, overall_rating, approved_at")
          .in(
            "self_review_id",
            selfReviews.map((s) => s.id as string),
          )
          .eq("org_id", access.orgId)
      : Promise.resolve({ data: [] as ReviewManagerRemarksRow[] }),
  ]);

  const cycleById = new Map(
    (cyclesRes.data ?? []).map((c) => [
      c.id as string,
      c as {
        id: string;
        title: string;
        status: string;
        period_start: string;
        period_end: string;
        self_review_due: string | null;
      },
    ]),
  );

  const remarksBySelf = new Map<string, ReviewManagerRemarksRow[]>();
  for (const rm of remarksRes.data ?? []) {
    const sid = rm.self_review_id as string;
    const arr = remarksBySelf.get(sid) ?? [];
    arr.push(rm as ReviewManagerRemarksRow);
    remarksBySelf.set(sid, arr);
  }

  const reviewRows: EmployeeReviewCycleRow[] = selfReviews.map((sr) => {
    const cycle = cycleById.get(sr.review_cycle_id as string);
    const remarkList = remarksBySelf.get(sr.id as string) ?? [];
    const st = sr.status as string;
    const selfStatus: EmployeeReviewCycleRow["selfStatus"] =
      st === "submitted" ? "submitted" : st === "late" ? "late" : "pending";

    const remarkStatus = rollupRemarkStatus(remarkList);
    const approved = remarkList.find((r) => r.status === "approved");
    const approvedRating =
      approved?.overall_rating != null ? (approved.overall_rating as number) : null;

    return {
      selfReviewId: sr.id as string,
      cycleId: sr.review_cycle_id as string,
      cycleTitle: cycle?.title?.trim() ? cycle.title : "Review cycle",
      cycleStatus: cycle?.status ?? "—",
      periodStart: cycle?.period_start ?? "",
      periodEnd: cycle?.period_end ?? "",
      selfReviewDue: cycle?.self_review_due ?? null,
      selfStatus,
      selfSubmittedAt: (sr.submitted_at as string | null) ?? null,
      remarkStatus,
      overallRating: remarkStatus === "approved" ? approvedRating : null,
      remarkApprovedAt: (approved?.approved_at as string | null) ?? null,
    };
  });

  return (
    <>
      <DashboardHeader
        title="Performance insights"
        description={`Self-review and approval status for ${employeeRow.name}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<Link href="/employees" />}
              nativeButton={false}
              className="rounded-lg shadow-sm"
            >
              All employees
            </Button>
            <EmployeeProfileActions
              employee={employeeRow}
              teams={(teamsRes.data ?? []) as { id: string; name: string }[]}
              departments={
                (departmentsRes.data ?? []) as { id: string; name: string }[]
              }
              readOnly={locked}
              accessRole={(accessRes.data?.role as string | null) ?? null}
              accessInvitedAt={(accessRes.data?.invited_at as string | null) ?? null}
              currentUserRole={access.role}
            />
          </div>
        }
      />
      <main className="flex-1 overflow-x-auto p-6 pb-14">
        <EmployeeInsightsView
          employee={employeeRow}
          reviewRows={reviewRows}
          readOnly={locked}
        />
      </main>
    </>
  );
}
