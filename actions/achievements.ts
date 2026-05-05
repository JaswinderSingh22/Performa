"use server";

import { revalidatePath } from "next/cache";

import { getOrgAccess } from "@/lib/org-context";
import { assertEmployeeUnlocked } from "@/lib/employee-lock";
import {
  achievementCreateSchema,
  achievementDeleteSchema,
  achievementUpdateSchema,
} from "@/validators/achievement";

export type AchievementActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateAchievementSurfaces(employeeId: string): void {
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath("/achievements");
}

export async function createAchievement(
  input: unknown,
): Promise<AchievementActionResult> {
  const parsed = achievementCreateSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "No organization context configured." };
  }

  if (parsed.data.achievement_date) {
    const t = Date.parse(parsed.data.achievement_date);
    if (Number.isNaN(t)) {
      return { ok: false, error: "Achievement date is invalid." };
    }
  }

  const employeeId = parsed.data.employeeId;

  const { data: employeeRow } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!employeeRow) {
    return {
      ok: false,
      error: "Employee not found in your organization.",
    };
  }

  const unlocked = await assertEmployeeUnlocked(access, employeeId);
  if (!unlocked.ok) return { ok: false, error: unlocked.error };

  const desc = parsed.data.description?.trim();
  const { error } = await access.supabase.from("achievements").insert({
    employee_id: employeeId,
    org_id: access.orgId,
    title: parsed.data.title.trim(),
    description: desc ? desc : null,
    category: parsed.data.category.trim(),
    achievement_date: parsed.data.achievement_date ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateAchievementSurfaces(employeeId);
  return { ok: true };
}

export async function updateAchievement(
  input: unknown,
): Promise<AchievementActionResult> {
  const parsed = achievementUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid achievement data." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "No organization context configured." };
  }

  const unlocked = await assertEmployeeUnlocked(access, parsed.data.employeeId);
  if (!unlocked.ok) return { ok: false, error: unlocked.error };

  if (parsed.data.achievement_date) {
    const t = Date.parse(parsed.data.achievement_date);
    if (Number.isNaN(t)) {
      return { ok: false, error: "Achievement date is invalid." };
    }
  }

  const { employeeId, id, title, category, achievement_date } = parsed.data;
  const desc = parsed.data.description?.trim();

  const { error } = await access.supabase
    .from("achievements")
    .update({
      title: title.trim(),
      description: desc ? desc : null,
      category: category.trim(),
      achievement_date: achievement_date ?? null,
    })
    .eq("id", id)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateAchievementSurfaces(employeeId);
  return { ok: true };
}

export async function deleteAchievement(
  input: unknown,
): Promise<AchievementActionResult> {
  const parsed = achievementDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid achievement id." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "No organization context configured." };
  }

  const unlocked = await assertEmployeeUnlocked(access, parsed.data.employeeId);
  if (!unlocked.ok) return { ok: false, error: unlocked.error };

  const { error } = await access.supabase
    .from("achievements")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateAchievementSurfaces(parsed.data.employeeId);
  return { ok: true };
}
