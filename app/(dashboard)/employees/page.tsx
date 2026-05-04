import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import type { ReactElement } from "react";

import {
  AnimatedEmployeesTable,
  type EmployeeListRow,
} from "@/components/employees/animated-employees-table";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getOrgAccess } from "@/lib/org-context";
import type { EmployeeRow } from "@/types/database";

export default async function EmployeesPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const [empRes, achRes, revRes, noteRes] = await Promise.all([
    access.supabase
      .from("employees")
      .select("*")
      .eq("org_id", access.orgId)
      .order("name", { ascending: true }),
    access.supabase
      .from("achievements")
      .select("employee_id")
      .eq("org_id", access.orgId),
    access.supabase
      .from("reviews")
      .select("employee_id")
      .eq("org_id", access.orgId),
    access.supabase
      .from("employee_notes")
      .select("employee_id")
      .eq("org_id", access.orgId),
  ]);

  if (empRes.error) {
    throw new Error(empRes.error.message);
  }
  if (achRes.error) {
    throw new Error(achRes.error.message);
  }
  if (revRes.error) {
    throw new Error(revRes.error.message);
  }
  if (noteRes.error) {
    throw new Error(noteRes.error.message);
  }

  const rows = (empRes.data ?? []) as EmployeeRow[];

  function buildCountIndex(
    data: readonly { employee_id: string }[] | null | undefined,
  ): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of data ?? []) {
      m.set(r.employee_id, (m.get(r.employee_id) ?? 0) + 1);
    }
    return m;
  }

  const achievementsByEmployee = buildCountIndex(achRes.data ?? undefined);
  const reviewsByEmployee = buildCountIndex(revRes.data ?? undefined);
  const notesByEmployee = buildCountIndex(noteRes.data ?? undefined);

  const enriched: EmployeeListRow[] = rows.map((employee) => ({
    ...employee,
    achievement_count: achievementsByEmployee.get(employee.id) ?? 0,
    review_count: reviewsByEmployee.get(employee.id) ?? 0,
    notes_count: notesByEmployee.get(employee.id) ?? 0,
  }));

  return (
    <>
      <DashboardHeader
        title="Employees"
        description="Managers you support with structured review context."
        actions={<AddEmployeeDialog />}
      />
      <main className="flex-1 overflow-x-auto p-6">
        {enriched.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted-foreground text-sm">
              No employees yet—add someone to begin tracking achievements,
              notes, and reviews.
            </p>
            <AddEmployeeDialog />
          </div>
        ) : (
          <AnimatedEmployeesTable employees={enriched} />
        )}
      </main>
    </>
  );
}
