import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { ImportEmployeesDialog } from "@/components/employees/import-employees-dialog";
import type { ReactElement } from "react";

import {
  type EmployeeListRow,
} from "@/components/employees/animated-employees-table";
import { EmployeeTableWrapper } from "@/components/employees/employee-table-wrapper";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getEffectivePlanFromOrg } from "@/lib/billing/getBillingState";
import { getOrgAccess } from "@/lib/org-context";
import { getMaxEmployees, isUnlimitedLimit, normalizePlan, planLabel } from "@/lib/plans";
import type { DepartmentRow, EmployeeRow, TeamRow } from "@/types/database";

export default async function EmployeesPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const isAdminLike = access.role === "admin" || access.role === "hr";
  const isScoped = !isAdminLike && (access.role === "manager" || access.role === "tl");

  // For scoped users (manager/TL): find teams they lead and show all members of those teams.
  // Admin/HR see everyone.
  let scopedTeamNames: string[] | null = null;
  if (isScoped) {
    if (access.employeeId) {
      const { data: myTeams } = await access.supabase
        .from("teams")
        .select("name")
        .eq("org_id", access.orgId)
        .eq("manager_employee_id", access.employeeId);
      scopedTeamNames = (myTeams ?? []).map((t) => t.name as string);
    } else {
      scopedTeamNames = []; // not linked to an employee record — see nothing
    }
  }

  // Build the main employee query.
  let empQuery = access.supabase
    .from("employees")
    .select("*")
    .eq("org_id", access.orgId)
    .order("name", { ascending: true });

  if (scopedTeamNames !== null) {
    if (scopedTeamNames.length === 0) {
      empQuery = empQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      // Show all employees in their teams, excluding themselves.
      empQuery = empQuery
        .in("team_name", scopedTeamNames)
        .neq("id", access.employeeId ?? "00000000-0000-0000-0000-000000000000");
    }
  }

  const [empRes, achRes, revRes, noteRes, teamRes, departmentRes, orgRes, accessRes, activeCycleRes] =
    await Promise.all([
    empQuery,
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
      .select("id, name, manager_employee_id")
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
    access.supabase
      .from("workspace_members")
      .select("employee_id, role, invited_at")
      .eq("org_id", access.orgId),
    // Fetch form tokens from the latest open review cycle
    access.supabase
      .from("employee_self_reviews")
      .select("employee_id, form_token")
      .eq("org_id", access.orgId)
      .in(
        "review_cycle_id",
        // Sub-select active cycle ids: we need a separate query first
        (await access.supabase
          .from("review_cycles")
          .select("id")
          .eq("org_id", access.orgId)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
        ).data?.map((c) => c.id) ?? [],
      ),
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
  if (accessRes.error) {
    throw new Error(accessRes.error.message);
  }

  const rows = (empRes.data ?? []) as EmployeeRow[];
  const orgRow = orgRes.data;
  const effectivePlan = normalizePlan(orgRow ? getEffectivePlanFromOrg(orgRow) : "free");
  const seatCap = getMaxEmployees(effectivePlan);
  const seatLimitReached = !isUnlimitedLimit(seatCap) && rows.length >= seatCap;
  const addDisabledReason = seatLimitReached
    ? `Your ${planLabel(effectivePlan)} workspace allows up to ${seatCap} employees. Upgrade to add more.`
    : null;
  const importDisabled = effectivePlan === "free";
  const importDisabledReason = importDisabled
    ? "CSV import is available on Pro and Pro+ plans. Upgrade to import employees in bulk."
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

  const accessByEmployee = new Map(
    (accessRes.data ?? []).map((m) => [m.employee_id as string, m]),
  );

  const teams = (teamRes.data ?? []) as Pick<TeamRow, "id" | "name" | "manager_employee_id">[];
  const leadEmployeeIds = new Set(
    teams.map((t) => t.manager_employee_id).filter((id): id is string => !!id),
  );
  const departments = (departmentRes.data ?? []) as Pick<DepartmentRow, "id" | "name">[];

  // Build form token lookup for active review cycle
  const formTokenByEmployee = new Map<string, string>(
    (activeCycleRes.data ?? []).map((r) => [
      r.employee_id as string,
      r.form_token as string,
    ]),
  );

  const enriched: EmployeeListRow[] = rows.map((employee) => {
    const member = accessByEmployee.get(employee.id);
    return {
      ...employee,
      achievement_count: achievementsByEmployee.get(employee.id) ?? 0,
      review_count: reviewsByEmployee.get(employee.id) ?? 0,
      notes_count: notesByEmployee.get(employee.id) ?? 0,
      is_team_lead: leadEmployeeIds.has(employee.id),
      access_role: (member?.role as string | null) ?? null,
      access_invited_at: (member?.invited_at as string | null) ?? null,
      review_form_token: formTokenByEmployee.get(employee.id) ?? null,
    };
  });

  const activeEmployees = hasLocked
    ? enriched.filter((e) => activeIdSet.has(e.id))
    : enriched;
  const lockedEmployees = hasLocked
    ? enriched.filter((e) => !activeIdSet.has(e.id))
    : [];

  return (
    <>
      <DashboardHeader
        title="Employees"
        description="Managers you support with structured review context."
        actions={
          isAdminLike ? (
            <div className="flex flex-wrap items-center gap-2">
              <ImportEmployeesDialog
                disabled={importDisabled}
                disabledReason={importDisabledReason}
              />
              <AddEmployeeDialog
                teams={teams}
                departments={departments}
                currentUserRole={access.role}
                disabled={seatLimitReached}
                disabledReason={addDisabledReason}
              />
            </div>
          ) : undefined
        }
      />
      <main className="flex-1 overflow-x-auto p-6">
        {enriched.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted-foreground text-sm">
              {isScoped
                ? "No employees found in your teams. Ask your admin to assign employees to your team."
                : "No employees yet—add someone to begin tracking achievements, notes, and reviews."}
            </p>
            {isAdminLike && (
              <>
                <ImportEmployeesDialog
                  disabled={importDisabled}
                  disabledReason={importDisabledReason}
                />
                <AddEmployeeDialog
                  teams={teams}
                  departments={departments}
                  currentUserRole={access.role}
                  disabled={seatLimitReached}
                  disabledReason={addDisabledReason}
                />
              </>
            )}
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
              {/* <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-heading text-sm font-semibold">Active</h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Fully usable employees within your seat cap.
                  </p>
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {activeEmployees.length} employees
                </p>
              </div> */}
              <EmployeeTableWrapper
                employees={activeEmployees}
                currentUserRole={access.role}
                teams={teams}
                departments={departments}
              />
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
                <EmployeeTableWrapper
                  employees={lockedEmployees}
                  lockedEmployeeIds={lockedEmployees.map((e) => e.id)}
                  currentUserRole={access.role}
                  teams={teams}
                  departments={departments}
                />
              </section>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
