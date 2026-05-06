import type { ReactElement } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { TeamsManager } from "@/components/teams/teams-manager";
import { getOrgAccess } from "@/lib/org-context";
import type { EmployeeRow } from "@/types/database";

type TeamRow = {
  id: string;
  org_id: string;
  name: string;
  department_id: string;
  manager_employee_id: string | null;
  created_at: string;
};

type DepartmentRow = {
  id: string;
  org_id: string;
  name: string;
  review_cadence: "monthly" | "quarterly" | "mid_year" | "yearly" | null;
  quarter_start_month: number | null;
  created_at: string;
};

export default async function TeamsPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const {
    data: { user },
  } = await access.supabase.auth.getUser();

  const [teamsRes, departmentsRes, employeesRes, profileRes, teamLeadsRes] = await Promise.all([
    access.supabase
      .from("teams")
      .select("*")
      .eq("org_id", access.orgId)
      .order("name", { ascending: true }),
    access.supabase
      .from("departments")
      .select("*")
      .eq("org_id", access.orgId)
      .order("name", { ascending: true }),
    access.supabase
      .from("employees")
      .select(
        "id, name, email, role, employee_code, is_active, team_name, department",
      )
      .eq("org_id", access.orgId)
      .order("name", { ascending: true }),
    user
      ? access.supabase
          .from("workspace_members")
          .select("role")
          .eq("org_id", access.orgId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    // Workspace members who have an employee record — eligible as team leads.
    access.supabase
      .from("workspace_members")
      .select("employee_id, role")
      .eq("org_id", access.orgId)
      .not("employee_id", "is", null),
  ]);

  if (teamsRes.error) {
    throw new Error(teamsRes.error.message);
  }
  if (employeesRes.error) {
    throw new Error(employeesRes.error.message);
  }
  if (departmentsRes.error) {
    throw new Error(departmentsRes.error.message);
  }

  const teams = (teamsRes.data ?? []) as TeamRow[];
  const departments = (departmentsRes.data ?? []) as DepartmentRow[];
  const allEmployees = (employeesRes.data ?? []) as Pick<
    EmployeeRow,
    | "id"
    | "name"
    | "email"
    | "role"
    | "employee_code"
    | "is_active"
    | "team_name"
    | "department"
  >[];
  const canManage = profileRes.data?.role === "admin" || profileRes.data?.role === "hr";

  // Build team lead options: workspace members linked to an employee record.
  const roleLabel: Record<string, string> = { admin: "Admin", hr: "HR", manager: "Manager", tl: "TL" };
  const employeeById = new Map(allEmployees.map((e) => [e.id, e]));
  const teamLeads = (teamLeadsRes.data ?? [])
    .filter((m) => m.employee_id)
    .map((m) => {
      const emp = employeeById.get(m.employee_id as string);
      return emp
        ? { employeeId: emp.id, name: emp.name, role: roleLabel[m.role as string] ?? m.role as string }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <DashboardHeader
        title="Organisation"
        description="Manage organisation teams and departments, then assign employees."
      />
      <main className="flex-1 overflow-x-auto">
        <TeamsManager
          teams={teams}
          departments={departments}
          employees={allEmployees}
          teamLeads={teamLeads}
          canManage={canManage}
        />
      </main>
    </>
  );
}
