import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { EmployeeProfileActions } from "@/components/employees/employee-profile-actions";
import { EmployeeInsightsView } from "@/components/employees/employee-insights-view";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { getOrgAccess } from "@/lib/org-context";
import { getEmployeeLockState } from "@/lib/employee-lock";
import type { AchievementRow } from "@/types/database";
import type { EmployeeNoteRow } from "@/types/database";
import type { EmployeeRow } from "@/types/database";

type PageProps = Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}>;

export default async function EmployeeInsightsPage({
  params,
  searchParams,
}: PageProps): Promise<ReactElement | null> {
  const { id } = await params;
  const sp = searchParams !== undefined ? await searchParams : {};
  const access = await getOrgAccess();
  if (!access) return null;

  const [
    employeeRes,
    teamsRes,
    departmentsRes,
    achievementsRes,
    notesRes,
    accessRes,
  ] =
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
        .select("id, name, review_cadence, quarter_start_month")
        .eq("org_id", access.orgId)
        .order("name", { ascending: true }),
      access.supabase
        .from("achievements")
        .select("*")
        .eq("employee_id", id)
        .eq("org_id", access.orgId)
        .order("created_at", { ascending: false }),
      access.supabase
        .from("employee_notes")
        .select("*")
        .eq("employee_id", id)
        .eq("org_id", access.orgId)
        .order("created_at", { ascending: false }),
      access.supabase
        .from("workspace_members")
        .select("role, invited_at")
        .eq("org_id", access.orgId)
        .eq("employee_id", id)
        .maybeSingle(),
    ]);

  const { data: employee, error: employeeError } = employeeRes;
  if (employeeError || !employee) {
    notFound();
  }

  const employeeRow = employee as EmployeeRow;
  const lockState = await getEmployeeLockState(access, employeeRow.id);
  const locked = lockState.locked;
  const employeeDepartment = (departmentsRes.data ?? []).find(
    (d) =>
      d.name.trim().toLowerCase() === (employeeRow.department?.trim().toLowerCase() ?? ""),
  );


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
          achievements={(achievementsRes.data ?? []) as AchievementRow[]}
          notes={(notesRes.data ?? []) as EmployeeNoteRow[]}
          reviews={[]}
          orgReviewCadence={
            (employeeDepartment?.review_cadence as
              | "monthly"
              | "quarterly"
              | "mid_year"
              | "yearly"
              | null) ?? "quarterly"
          }
          orgQuarterStartMonth={employeeDepartment?.quarter_start_month ?? 1}
          initialTab={sp.tab}
          readOnly={locked}
        />
      </main>
    </>
  );
}
