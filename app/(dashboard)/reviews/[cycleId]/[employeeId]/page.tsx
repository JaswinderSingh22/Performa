import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ManagerRemarksForm } from "@/components/reviews/manager-remarks-form";
import { buttonVariants } from "@/components/ui/button";
import { getOrgAccess } from "@/lib/org-context";
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

  const canReview = ["admin", "hr", "manager", "tl"].includes(access.role ?? "");
  const canApprove = access.role === "admin" || access.role === "hr";

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

  // Load existing remarks
  const { data: remarksData } = selfReview
    ? await access.supabase
        .from("review_manager_remarks")
        .select("*")
        .eq("self_review_id", selfReview.id)
        .eq("org_id", access.orgId)
        .maybeSingle()
    : { data: null };

  const remarks = remarksData as ReviewManagerRemarksRow | null;

  return (
    <>
      <DashboardHeader
        title={employee.name}
        description={`Review for ${cycle.title}`}
        actions={
          <Link href={`/reviews/${cycleId}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}>
            <ArrowLeftIcon className="size-4" />
            Back to cycle
          </Link>
        }
      />

      <main className="flex-1 overflow-x-auto p-6">
        <ManagerRemarksForm
          cycle={cycle}
          employee={employee}
          selfReview={selfReview}
          existingRemarks={remarks}
          canReview={canReview}
          canApprove={canApprove}
        />
      </main>
    </>
  );
}
