import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { GenerateReviewFromPeriodWizard } from "@/components/employees/generate-review-from-period-wizard";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getOrgAccess } from "@/lib/org-context";
import { getEmployeeLockState } from "@/lib/employee-lock";
import type { EmployeeRow, ReviewCadence } from "@/types/database";

function isReviewStitchable(raw: {
  period_start: string | null | undefined;
  period_end: string | null | undefined;
  source_review_ids: unknown;
  final_review: string | null | undefined;
  ai_draft: string | null | undefined;
}): boolean {
  if (!raw.period_start || !raw.period_end) return false;
  const nested = raw.source_review_ids;
  if (Array.isArray(nested) && nested.length > 0) return false;
  const f = raw.final_review?.trim().length ?? 0;
  if (f >= 15) return true;
  const a = raw.ai_draft?.trim().length ?? 0;
  return a >= 40;
}

type PageProps = Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    cadence?: string;
    periodKey?: string;
    from?: string;
    to?: string;
    label?: string;
  }>;
}>;

export default async function EmployeeGenerateReviewPage({
  params,
  searchParams,
}: PageProps): Promise<ReactElement | null> {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const access = await getOrgAccess();
  if (!access) return null;

  const [employeeRes] = await Promise.all([
    access.supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .eq("org_id", access.orgId)
      .maybeSingle(),
  ]);

  if (employeeRes.error || !employeeRes.data) {
    notFound();
  }

  const employee = employeeRes.data as EmployeeRow;
  const readOnly = (await getEmployeeLockState(access, employee.id)).locked;

  const cadenceParam = sp.cadence;
  const parsedCadence: ReviewCadence | null =
    cadenceParam === "monthly" ||
    cadenceParam === "quarterly" ||
    cadenceParam === "mid_year" ||
    cadenceParam === "yearly"
      ? cadenceParam
      : null;

  const { data: reviewsRaw } = await access.supabase
    .from("reviews")
    .select(
      "id, title, period_start, period_end, source_review_ids, final_review, ai_draft",
    )
    .eq("employee_id", id)
    .eq("org_id", access.orgId)
    .order("period_start", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const stitchableReviews = (reviewsRaw ?? []).filter(isReviewStitchable).map(
    (r) => ({
      id: r.id,
      title: r.title,
      period_start: r.period_start!.slice(0, 10),
      period_end: r.period_end!.slice(0, 10),
    }),
  );

  const [departmentRes, achCountRes, notesCountRes, reviewsCountRes] = await Promise.all([
    access.supabase
      .from("departments")
      .select("review_cadence, quarter_start_month, name")
      .eq("org_id", access.orgId)
      .eq("name", employee.department ?? "")
      .maybeSingle(),
    access.supabase
      .from("achievements")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", id)
      .eq("org_id", access.orgId),
    access.supabase
      .from("employee_notes")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", id)
      .eq("org_id", access.orgId),
    access.supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", id)
      .eq("org_id", access.orgId),
  ]);

  const contextCounts = {
    achievements: achCountRes.count ?? 0,
    notes: notesCountRes.count ?? 0,
    reviews: reviewsCountRes.count ?? 0,
  };

  const lockedPeriod =
    typeof sp.from === "string" &&
    typeof sp.to === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(sp.from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(sp.to) &&
    sp.from <= sp.to
      ? {
          from: sp.from,
          to: sp.to,
          cadence: parsedCadence,
          periodKey:
            typeof sp.periodKey === "string" && sp.periodKey.trim().length > 0
              ? sp.periodKey.trim()
              : null,
          label:
            typeof sp.label === "string" && sp.label.trim().length > 0
              ? sp.label.trim()
              : null,
        }
      : null;

  return (
    <>
      <DashboardHeader
        title="Roll-up review"
        description={`Combines notes, achievements, and prior reviews for one period—use AI or enter everything manually. ${employee.name}`}
      />
      <main className="flex-1 overflow-x-auto p-6 pb-14">
        <GenerateReviewFromPeriodWizard
          employeeId={id}
          employeeName={employee.name}
          employeeJoinDate={employee.join_date}
          readOnly={readOnly}
          defaultCadence={
            ((departmentRes.data?.review_cadence as ReviewCadence | null) ?? "quarterly")
          }
          quarterStartMonth={
            typeof departmentRes.data?.quarter_start_month === "number"
              ? departmentRes.data.quarter_start_month
              : 1
          }
          lockedPeriod={lockedPeriod}
          stitchableReviews={stitchableReviews}
          contextCounts={contextCounts}
        />
      </main>
    </>
  );
}
