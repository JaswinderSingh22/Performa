import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import type { ReactElement } from "react";

import {
  AnimatedEmployeesTable,
  type EmployeeListRow,
} from "@/components/employees/animated-employees-table";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getEffectivePlanFromOrg } from "@/lib/billing/getBillingState";
import { getOrgAccess } from "@/lib/org-context";
import { getMaxEmployees, isUnlimitedLimit, normalizePlan, planLabel } from "@/lib/plans";
import type { DepartmentRow, EmployeeRow, TeamRow } from "@/types/database";

export default async function EmployeesPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const [empRes, achRes, revRes, noteRes, teamRes, departmentRes, orgRes] =
    await Promise.all([
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
      .from("organizations")
      .select("id, plan, subscription_status, subscription_current_end, razorpay_subscription_id")
      .eq("id", access.orgId)
      .maybeSingle(),
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
  if (teamRes.error) {
    throw new Error(teamRes.error.message);
  }
  if (departmentRes.error) {
    throw new Error(departmentRes.error.message);
  }
  if (orgRes.error) {
    throw new Error(orgRes.error.message);
  }

  const rows = (empRes.data ?? []) as EmployeeRow[];
  const orgRow = orgRes.data;
  const effectivePlan = normalizePlan(orgRow ? getEffectivePlanFromOrg(orgRow) : "free");
  const seatCap = getMaxEmployees(effectivePlan);
  const seatLimitReached = !isUnlimitedLimit(seatCap) && rows.length >= seatCap;
  const addDisabledReason = seatLimitReached
    ? `Your ${planLabel(effectivePlan)} workspace allows up to ${seatCap} employees. Upgrade to add more.`
    : null;

  const createdSorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const activeIdSet = new Set(
    !isUnlimitedLimit(seatCap) ? createdSorted.slice(0, seatCap).map((r) => r.id) : [],
  );
  const hasLocked = !isUnlimitedLimit(seatCap) && rows.length > seatCap;

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

  const activeEmployees = hasLocked
    ? enriched.filter((e) => activeIdSet.has(e.id))
    : enriched;
  const lockedEmployees = hasLocked
    ? enriched.filter((e) => !activeIdSet.has(e.id))
    : [];

  const teams = (teamRes.data ?? []) as Pick<TeamRow, "id" | "name">[];
  const departments = (departmentRes.data ?? []) as Pick<
    DepartmentRow,
    "id" | "name"
  >[];

  return (
    <>
      <DashboardHeader
        title="Employees"
        description="Managers you support with structured review context."
        actions={
          <AddEmployeeDialog
            teams={teams}
            departments={departments}
            disabled={seatLimitReached}
            disabledReason={addDisabledReason}
          />
        }
      />
      <main className="flex-1 overflow-x-auto p-6">
        {enriched.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted-foreground text-sm">
              No employees yet—add someone to begin tracking achievements,
              notes, and reviews.
            </p>
            <AddEmployeeDialog
              teams={teams}
              departments={departments}
              disabled={seatLimitReached}
              disabledReason={addDisabledReason}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {hasLocked ? (
              <div className="border-border/70 bg-muted/20 text-muted-foreground rounded-xl border px-4 py-3 text-sm leading-relaxed">
                Your workspace is over its seat limit. The <strong className="text-foreground font-medium">most recently created {seatCap}</strong>{" "}
                employees are active; remaining employees are <strong className="text-foreground font-medium">locked (view-only)</strong>.
              </div>
            ) : null}

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-heading text-sm font-semibold">Active</h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Fully usable employees within your seat cap.
                  </p>
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {activeEmployees.length} employees
                </p>
              </div>
              <AnimatedEmployeesTable employees={activeEmployees} />
            </section>

            {hasLocked ? (
              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-sm font-semibold">Locked</h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      View-only employees exceeding your plan limit.
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {lockedEmployees.length} employees
                  </p>
                </div>
                <AnimatedEmployeesTable
                  employees={lockedEmployees}
                  lockedEmployeeIds={lockedEmployees.map((e) => e.id)}
                />
              </section>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
