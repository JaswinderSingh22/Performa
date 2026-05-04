import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { EmployeeInsightsView } from "@/components/employees/employee-insights-view";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { getOrgAccess } from "@/lib/org-context";
import type { AchievementRow } from "@/types/database";
import type { EmployeeNoteRow } from "@/types/database";
import type { EmployeeRow } from "@/types/database";
import type { ReviewWithDimensions } from "@/types/database";

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export default async function EmployeeInsightsPage({
  params,
}: PageProps): Promise<ReactElement | null> {
  const { id } = await params;
  const access = await getOrgAccess();
  if (!access) return null;

  const { data: employee, error: employeeError } = await access.supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (employeeError || !employee) {
    notFound();
  }

  const employeeRow = employee as EmployeeRow;

  const [achievementsRes, reviewsRes, notesRes] = await Promise.all([
    access.supabase
      .from("achievements")
      .select("*")
      .eq("employee_id", id)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false }),
    access.supabase
      .from("reviews")
      .select(
        `
        *,
        review_dimensions (
          id,
          review_id,
          org_id,
          label,
          analysis,
          rating,
          sort_order,
          created_at
        )
      `,
      )
      .eq("employee_id", id)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false }),
    access.supabase
      .from("employee_notes")
      .select("*")
      .eq("employee_id", id)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <DashboardHeader
        title="Performance insights"
        description={`Grounded view of context and review signals for ${employeeRow.name}.`}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<Link href={`/employees/${id}`} />}
              nativeButton={false}
              className="rounded-lg shadow-sm"
            >
              Profile & capture
            </Button>
            <Button
              type="button"
              size="sm"
              render={<Link href={`/employees/${id}/generate-review`} />}
              nativeButton={false}
              className="rounded-lg shadow-sm"
            >
              Roll-up review
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-x-auto p-6 pb-14">
        <EmployeeInsightsView
          employee={employeeRow}
          achievements={(achievementsRes.data ?? []) as AchievementRow[]}
          notes={(notesRes.data ?? []) as EmployeeNoteRow[]}
          reviews={(reviewsRes.data ?? []) as ReviewWithDimensions[]}
        />
      </main>
    </>
  );
}
