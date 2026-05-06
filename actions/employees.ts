"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
import {
  getMaxEmployees,
  isUnlimitedLimit,
  normalizePlan,
  planLabel,
} from "@/lib/plans";
import { getEffectivePlanFromOrg } from "@/lib/billing/getBillingState";
import { assertEmployeeUnlocked } from "@/lib/employee-lock";

import { isUniqueViolation } from "@/types/database";
import {
  employeeCreateSchema,
  employeeDeleteSchema,
  employeeUpdateSchema,
} from "@/validators/employee";

export type EmployeeActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function resolveReportingToEmployeeId(
  access: Awaited<ReturnType<typeof getOrgAccess>>,
  reportingEmployeeCodeRaw: string,
  employeeId: string | null,
): Promise<
  | { ok: true; reportingToEmployeeId: string | null }
  | { ok: false; error: string }
> {
  if (!access) return { ok: false, error: "We could not load your workspace." };
  const employeeCode = reportingEmployeeCodeRaw.trim();
  if (!employeeCode) return { ok: true, reportingToEmployeeId: null };
  const { data: manager } = await access.supabase
    .from("employees")
    .select("id")
    .eq("org_id", access.orgId)
    .eq("employee_code", employeeCode)
    .maybeSingle();
  if (!manager?.id) {
    return {
      ok: false,
      error: `Reporting manager (Employee ID ${employeeCode}) is not in your workspace yet.`,
    };
  }
  if (employeeId && manager.id === employeeId) {
    return { ok: false, error: "Reporting manager cannot be the employee." };
  }
  return { ok: true, reportingToEmployeeId: manager.id };
}

function revalidateEmployeeSurfaces(employeeId: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath(`/employees/${employeeId}/insights`);
  revalidatePath("/reviews");
  revalidatePath("/achievements");
  revalidatePath("/notes");
}

export async function createEmployee(
  input: unknown,
): Promise<EmployeeActionResult<{ id: string }>> {
  const parsed = employeeCreateSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return {
      ok: false,
      error:
        "We could not load your workspace. Sign in again, or verify that the application is configured correctly.",
    };
  }

  if (parsed.data.join_date) {
    const t = Date.parse(parsed.data.join_date);
    if (Number.isNaN(t)) {
      return { ok: false, error: "Join date is not a valid calendar date." };
    }
  }

  const [{ count: existingCount, error: cntError }, { data: orgPlanRow }] =
    await Promise.all([
      access.supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("org_id", access.orgId),
      access.supabase
        .from("organizations")
        .select("id, plan, subscription_status, subscription_current_end, razorpay_subscription_id")
        .eq("id", access.orgId)
        .maybeSingle(),
    ]);

  if (cntError) {
    return { ok: false, error: cntError.message };
  }

  const plan = normalizePlan(
    orgPlanRow ? getEffectivePlanFromOrg(orgPlanRow) : undefined,
  );
  const seatCap = getMaxEmployees(plan);
  if (!isUnlimitedLimit(seatCap) && (existingCount ?? 0) >= seatCap) {
    return {
      ok: false,
      error: `Your ${planLabel(plan)} workspace can include up to ${seatCap} people. Upgrade the plan in Settings to add more.`,
    };
  }

  const { data, error } = await access.supabase
    .from("employees")
    .insert({
      org_id: access.orgId,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      employee_code: parsed.data.employee_code.trim(),
      is_active: parsed.data.is_active === false ? false : true,
      role: parsed.data.role.trim() ? parsed.data.role.trim() : "",
      department: "",
      team_name: "",
      join_date: parsed.data.join_date ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "You already have an employee with this email or Employee ID.",
      };
    }
    return { ok: false, error: error.message };
  }

  const inputTeamName = parsed.data.team_name.trim();
  const inputDepartment = parsed.data.department.trim();
  const reportingResolved = await resolveReportingToEmployeeId(
    access,
    parsed.data.reporting_to_employee_code ?? "",
    data.id,
  );
  if (!reportingResolved.ok) return { ok: false, error: reportingResolved.error };

  if (inputTeamName.length > 0) {
    const { data: matchedTeam, error: teamErr } = await access.supabase
      .from("teams")
      .select("name, departments(name)")
      .eq("org_id", access.orgId)
      .ilike("name", inputTeamName)
      .maybeSingle();
    if (teamErr || !matchedTeam) {
      return { ok: false, error: "Selected team no longer exists." };
    }
    const deptRel = matchedTeam.departments as
      | { name?: string }
      | { name?: string }[]
      | null;
    const teamDepartment = Array.isArray(deptRel)
      ? (deptRel[0]?.name ?? "")
      : (deptRel?.name ?? "");
    await access.supabase
      .from("employees")
      .update({
        team_name: matchedTeam.name.trim(),
        department: teamDepartment.trim(),
        reporting_to_employee_id: reportingResolved.reportingToEmployeeId,
      })
      .eq("id", data.id)
      .eq("org_id", access.orgId);
  } else if (inputDepartment.length > 0) {
    await access.supabase
      .from("employees")
      .update({
        department: inputDepartment,
        team_name: "",
        reporting_to_employee_id: reportingResolved.reportingToEmployeeId,
      })
      .eq("id", data.id)
      .eq("org_id", access.orgId);
  } else {
    await access.supabase
      .from("employees")
      .update({ reporting_to_employee_id: reportingResolved.reportingToEmployeeId })
      .eq("id", data.id)
      .eq("org_id", access.orgId);
  }

  revalidateEmployeeSurfaces(data.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateEmployee(
  input: unknown,
): Promise<EmployeeActionResult<{ id: string }>> {
  const parsed = employeeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return {
      ok: false,
      error:
        "We could not load your workspace. Sign in again, or verify configuration.",
    };
  }

  if (parsed.data.join_date) {
    const t = Date.parse(parsed.data.join_date);
    if (Number.isNaN(t)) {
      return { ok: false, error: "Join date is not a valid calendar date." };
    }
  }

  const employeeId = parsed.data.employeeId;
  const { data: existing } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Employee not found in your workspace." };
  }

  const unlocked = await assertEmployeeUnlocked(access, employeeId);
  if (!unlocked.ok) return { ok: false, error: unlocked.error };

  let nextTeamName = "";
  let nextDepartment = parsed.data.department.trim() ? parsed.data.department.trim() : "";
  const teamInput = parsed.data.team_name.trim();
  const reportingResolved = await resolveReportingToEmployeeId(
    access,
    parsed.data.reporting_to_employee_code ?? "",
    employeeId,
  );
  if (!reportingResolved.ok) return { ok: false, error: reportingResolved.error };
  if (teamInput.length > 0) {
    const { data: matchedTeam, error: teamErr } = await access.supabase
      .from("teams")
      .select("name, departments(name)")
      .eq("org_id", access.orgId)
      .ilike("name", teamInput)
      .maybeSingle();
    if (teamErr || !matchedTeam) {
      return { ok: false, error: "Selected team no longer exists." };
    }
    nextTeamName = matchedTeam.name.trim();
    const deptRel = matchedTeam.departments as
      | { name?: string }
      | { name?: string }[]
      | null;
    nextDepartment = Array.isArray(deptRel)
      ? (deptRel[0]?.name?.trim() ?? "")
      : (deptRel?.name?.trim() ?? "");
  }

  const { data, error } = await access.supabase
    .from("employees")
    .update({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      employee_code: parsed.data.employee_code.trim(),
      is_active: parsed.data.is_active === false ? false : true,
      role: parsed.data.role.trim() ? parsed.data.role.trim() : "",
      department: nextDepartment,
      team_name: nextTeamName,
      join_date: parsed.data.join_date ?? null,
      reporting_to_employee_id: reportingResolved.reportingToEmployeeId,
    })
    .eq("id", employeeId)
    .eq("org_id", access.orgId)
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "You already have an employee with this email.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateEmployeeSurfaces(data.id);
  return { ok: true, data: { id: data.id } };
}

export async function deleteEmployee(
  input: unknown,
): Promise<EmployeeActionResult> {
  const parsed = employeeDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid delete request." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { data: existing } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Employee not found in your workspace." };
  }

  const unlocked = await assertEmployeeUnlocked(access, parsed.data.employeeId);
  if (!unlocked.ok) return { ok: false, error: unlocked.error };

  const { error } = await access.supabase
    .from("employees")
    .delete()
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateEmployeeSurfaces(parsed.data.employeeId);
  return { ok: true };
}

const employeeReviewCadenceSchema = z.object({
  employeeId: z.uuid(),
  reviewCadence: z.enum([
    "monthly",
    "quarterly",
    "mid_year",
    "yearly",
  ]),
});

export async function updateEmployeeReviewCadence(
  input: unknown,
): Promise<EmployeeActionResult> {
  const parsed = employeeReviewCadenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request.",
    };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { data: existing } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Employee not found in your workspace." };
  }

  const unlocked = await assertEmployeeUnlocked(access, parsed.data.employeeId);
  if (!unlocked.ok) return { ok: false, error: unlocked.error };

  const { error } = await access.supabase
    .from("employees")
    .update({ review_cadence: parsed.data.reviewCadence })
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateEmployeeSurfaces(parsed.data.employeeId);
  return { ok: true };
}