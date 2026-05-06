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

  const [teamsRes, departmentsRes, employeesRes, profileRes] = await Promise.all([
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
        "id, name, email, role, employee_code, reporting_to_employee_id, is_active, team_name, department",
      )
      .eq("org_id", access.orgId)
      .order("name", { ascending: true }),
    user
      ? access.supabase.from("users").select("role").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
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
  const employees = (employeesRes.data ?? []) as Pick<
    EmployeeRow,
    | "id"
    | "name"
    | "email"
    | "role"
    | "employee_code"
    | "reporting_to_employee_id"
    | "is_active"
    | "team_name"
    | "department"
  >[];
  const canManage = profileRes.data?.role === "admin";

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
          employees={employees}
          canManage={canManage}
        />
      </main>
    </>
  );
}
