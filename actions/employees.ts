"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
import { normalizePlan, PLAN_LIMITS, planLabel } from "@/lib/plans";

import { isUniqueViolation } from "@/types/database";
import {
  employeeCreateSchema,
  employeeDeleteSchema,
  employeeUpdateSchema,
} from "@/validators/employee";

export type EmployeeActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

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
        .select("plan")
        .eq("id", access.orgId)
        .maybeSingle(),
    ]);

  if (cntError) {
    return { ok: false, error: cntError.message };
  }

  const plan = normalizePlan(orgPlanRow?.plan);
  const seatCap = PLAN_LIMITS[plan].seats;
  if ((existingCount ?? 0) >= seatCap) {
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
      role: parsed.data.role.trim() ? parsed.data.role.trim() : "",
      department: parsed.data.department.trim()
        ? parsed.data.department.trim()
        : "",
      team_name: parsed.data.team_name.trim()
        ? parsed.data.team_name.trim()
        : "",
      join_date: parsed.data.join_date ?? null,
    })
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

  const { data, error } = await access.supabase
    .from("employees")
    .update({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role.trim() ? parsed.data.role.trim() : "",
      department: parsed.data.department.trim()
        ? parsed.data.department.trim()
        : "",
      team_name: parsed.data.team_name.trim()
        ? parsed.data.team_name.trim()
        : "",
      join_date: parsed.data.join_date ?? null,
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