"use server";

import { revalidatePath } from "next/cache";

import { getOrgAccess } from "@/lib/org-context";
import { isUniqueViolation } from "@/types/database";
import {
  departmentCreateSchema,
  departmentDeleteSchema,
  departmentReviewCycleSchema,
  departmentRenameSchema,
  employeeDepartmentAssignmentSchema,
  teamDepartmentAssignmentSchema,
  employeeTeamAssignmentSchema,
  teamCreateSchema,
  teamDeleteSchema,
  teamRenameSchema,
} from "@/validators/teams";

type TeamActionResult = { ok: true } | { ok: false; error: string };

function revalidateTeamSurfaces(): void {
  revalidatePath("/teams");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
}

async function ensureAdminRole(): Promise<
  | { ok: true; access: Awaited<ReturnType<typeof getOrgAccess>>; userId: string }
  | { ok: false; error: string }
> {
  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }
  const {
    data: { user },
    error: userErr,
  } = await access.supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "You must be signed in." };
  }
  const { data: profile } = await access.supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can manage teams." };
  }
  return { ok: true, access, userId: user.id };
}

export async function createTeam(input: unknown): Promise<TeamActionResult> {
  const parsed = teamCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid team." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { error } = await access.supabase.from("teams").insert({
    org_id: access.orgId,
    name: parsed.data.name,
    department_id: parsed.data.departmentId,
  });
  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "A team with this name already exists." };
    }
    return { ok: false, error: error.message };
  }

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function renameTeam(input: unknown): Promise<TeamActionResult> {
  const parsed = teamRenameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rename." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { data: team, error: teamErr } = await access.supabase
    .from("teams")
    .select("id, name, department_id, departments(name)")
    .eq("id", parsed.data.teamId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (teamErr || !team) {
    return { ok: false, error: "Team not found." };
  }

  const oldName = team.name.trim();
  const newName = parsed.data.name.trim();
  if (oldName === newName) return { ok: true };

  const { error: updateErr } = await access.supabase
    .from("teams")
    .update({ name: newName })
    .eq("id", team.id)
    .eq("org_id", access.orgId);
  if (updateErr) {
    if (isUniqueViolation(updateErr)) {
      return { ok: false, error: "A team with this name already exists." };
    }
    return { ok: false, error: updateErr.message };
  }

  const { error: empErr } = await access.supabase
    .from("employees")
    .update({ team_name: newName })
    .eq("org_id", access.orgId)
    .eq("team_name", oldName);
  if (empErr) {
    return { ok: false, error: empErr.message };
  }

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function deleteTeam(input: unknown): Promise<TeamActionResult> {
  const parsed = teamDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid delete request." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { data: team, error: teamErr } = await access.supabase
    .from("teams")
    .select("id, name")
    .eq("id", parsed.data.teamId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (teamErr || !team) {
    return { ok: false, error: "Team not found." };
  }

  const teamName = team.name.trim();

  const { error: clearErr } = await access.supabase
    .from("employees")
    .update({ team_name: "" })
    .eq("org_id", access.orgId)
    .eq("team_name", teamName);
  if (clearErr) {
    return { ok: false, error: clearErr.message };
  }

  const { error: delErr } = await access.supabase
    .from("teams")
    .delete()
    .eq("id", team.id)
    .eq("org_id", access.orgId);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function assignEmployeeTeam(input: unknown): Promise<TeamActionResult> {
  const parsed = employeeTeamAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid assignment request." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { data: emp, error: empErr } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (empErr || !emp) {
    return { ok: false, error: "Employee not found." };
  }

  let teamName = "";
  let departmentName = "";
  if (parsed.data.teamId) {
    const { data: team, error: teamErr } = await access.supabase
      .from("teams")
      .select("name, departments(name)")
      .eq("id", parsed.data.teamId)
      .eq("org_id", access.orgId)
      .maybeSingle();
    if (teamErr || !team) {
      return { ok: false, error: "Team not found." };
    }
    teamName = team.name.trim();
    const deptRel = team.departments as { name?: string } | { name?: string }[] | null;
    if (Array.isArray(deptRel)) {
      departmentName = deptRel[0]?.name?.trim() ?? "";
    } else {
      departmentName = deptRel?.name?.trim() ?? "";
    }
  }

  const { error: updErr } = await access.supabase
    .from("employees")
    .update({ team_name: teamName, department: departmentName })
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId);
  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function assignTeamDepartment(input: unknown): Promise<TeamActionResult> {
  const parsed = teamDepartmentAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid team department assignment." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { data: team, error: teamErr } = await access.supabase
    .from("teams")
    .select("id, name, department_id")
    .eq("id", parsed.data.teamId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (teamErr || !team) {
    return { ok: false, error: "Team not found." };
  }

  const { data: department, error: deptErr } = await access.supabase
    .from("departments")
    .select("id, name")
    .eq("id", parsed.data.departmentId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (deptErr || !department) {
    return { ok: false, error: "Department not found." };
  }

  const { error: updateTeamErr } = await access.supabase
    .from("teams")
    .update({ department_id: department.id })
    .eq("id", team.id)
    .eq("org_id", access.orgId);
  if (updateTeamErr) {
    return { ok: false, error: updateTeamErr.message };
  }

  const teamName = team.name.trim();
  const { error: updateEmployeesErr } = await access.supabase
    .from("employees")
    .update({ department: department.name.trim() })
    .eq("org_id", access.orgId)
    .eq("team_name", teamName);
  if (updateEmployeesErr) {
    return { ok: false, error: updateEmployeesErr.message };
  }

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function createDepartment(input: unknown): Promise<TeamActionResult> {
  const parsed = departmentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid department." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { error } = await access.supabase.from("departments").insert({
    org_id: access.orgId,
    name: parsed.data.name,
    review_cadence: "quarterly",
    quarter_start_month: 1,
  });
  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "A department with this name already exists." };
    }
    return { ok: false, error: error.message };
  }
  revalidateTeamSurfaces();
  return { ok: true };
}

export async function renameDepartment(input: unknown): Promise<TeamActionResult> {
  const parsed = departmentRenameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rename." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { data: department, error: deptErr } = await access.supabase
    .from("departments")
    .select("id, name")
    .eq("id", parsed.data.departmentId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (deptErr || !department) {
    return { ok: false, error: "Department not found." };
  }

  const oldName = department.name.trim();
  const newName = parsed.data.name.trim();
  if (oldName === newName) return { ok: true };

  const { error: updateErr } = await access.supabase
    .from("departments")
    .update({ name: newName })
    .eq("id", department.id)
    .eq("org_id", access.orgId);
  if (updateErr) {
    if (isUniqueViolation(updateErr)) {
      return { ok: false, error: "A department with this name already exists." };
    }
    return { ok: false, error: updateErr.message };
  }

  const { error: empErr } = await access.supabase
    .from("employees")
    .update({ department: newName })
    .eq("org_id", access.orgId)
    .eq("department", oldName);
  if (empErr) return { ok: false, error: empErr.message };

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function deleteDepartment(input: unknown): Promise<TeamActionResult> {
  const parsed = departmentDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid delete request." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { data: department, error: deptErr } = await access.supabase
    .from("departments")
    .select("id, name")
    .eq("id", parsed.data.departmentId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (deptErr || !department) {
    return { ok: false, error: "Department not found." };
  }

  const deptName = department.name.trim();
  const { error: clearErr } = await access.supabase
    .from("employees")
    .update({ department: "" })
    .eq("org_id", access.orgId)
    .eq("department", deptName);
  if (clearErr) return { ok: false, error: clearErr.message };

  const { error: delErr } = await access.supabase
    .from("departments")
    .delete()
    .eq("id", department.id)
    .eq("org_id", access.orgId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function assignEmployeeDepartment(
  input: unknown,
): Promise<TeamActionResult> {
  const parsed = employeeDepartmentAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid assignment request." };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { data: emp, error: empErr } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  if (empErr || !emp) {
    return { ok: false, error: "Employee not found." };
  }

  let department = "";
  if (parsed.data.departmentId) {
    const { data: dept, error: deptErr } = await access.supabase
      .from("departments")
      .select("name")
      .eq("id", parsed.data.departmentId)
      .eq("org_id", access.orgId)
      .maybeSingle();
    if (deptErr || !dept) {
      return { ok: false, error: "Department not found." };
    }
    department = dept.name.trim();
  }

  const { error: updErr } = await access.supabase
    .from("employees")
    .update({ department })
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidateTeamSurfaces();
  return { ok: true };
}

export async function updateDepartmentReviewCycle(
  input: unknown,
): Promise<TeamActionResult> {
  const parsed = departmentReviewCycleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid review cycle settings.",
    };
  }
  const admin = await ensureAdminRole();
  if (!admin.ok) return admin;
  const access = admin.access;
  if (!access) return { ok: false, error: "Workspace not found." };

  const { error } = await access.supabase
    .from("departments")
    .update({
      review_cadence: parsed.data.reviewCadence,
      quarter_start_month: parsed.data.quarterStartMonth,
    })
    .eq("id", parsed.data.departmentId)
    .eq("org_id", access.orgId);

  if (error) return { ok: false, error: error.message };

  revalidateTeamSurfaces();
  revalidatePath("/employees");
  return { ok: true };
}
