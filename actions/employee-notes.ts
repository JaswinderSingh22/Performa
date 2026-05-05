"use server";

import { revalidatePath } from "next/cache";

import { getOrgAccess, type OrgAccess } from "@/lib/org-context";
import {
  employeeNoteCreateSchema,
  employeeNoteDeleteSchema,
  employeeNoteUpdateSchema,
} from "@/validators/employee-note";

export type EmployeeNoteActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateNoteSurfaces(employeeId: string): void {
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath("/notes");
}

async function verifyEmployeeInOrg(
  access: OrgAccess,
  employeeId: string,
): Promise<boolean> {
  const { data } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function createEmployeeNote(
  input: unknown,
): Promise<EmployeeNoteActionResult> {
  const parsed = employeeNoteCreateSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Check the note and try again.";
    return { ok: false as const, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return {
      ok: false as const,
      error:
        "We could not load your workspace. Sign in again, or verify configuration.",
    };
  }

  if (!(await verifyEmployeeInOrg(access, parsed.data.employeeId))) {
    return { ok: false as const, error: "Employee not found in your workspace." };
  }

  const { error } = await access.supabase.from("employee_notes").insert({
    employee_id: parsed.data.employeeId,
    org_id: access.orgId,
    body: parsed.data.body.trim(),
    ...(parsed.data.note_date
      ? {
          created_at: `${parsed.data.note_date}T12:00:00.000Z`,
          updated_at: `${parsed.data.note_date}T12:00:00.000Z`,
        }
      : {}),
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidateNoteSurfaces(parsed.data.employeeId);
  return { ok: true as const };
}

export async function updateEmployeeNote(
  input: unknown,
): Promise<EmployeeNoteActionResult> {
  const parsed = employeeNoteUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid note update." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return {
      ok: false as const,
      error:
        "We could not load your workspace. Sign in again, or verify configuration.",
    };
  }

  const { data: existing } = await access.supabase
    .from("employee_notes")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("employee_id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!existing) {
    return { ok: false as const, error: "Note not found or unavailable." };
  }

  const { error } = await access.supabase
    .from("employee_notes")
    .update({
      body: parsed.data.body.trim(),
      ...(parsed.data.note_date
        ? {
            created_at: `${parsed.data.note_date}T12:00:00.000Z`,
            updated_at: `${parsed.data.note_date}T12:00:00.000Z`,
          }
        : { updated_at: new Date().toISOString() }),
    })
    .eq("id", parsed.data.id)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidateNoteSurfaces(parsed.data.employeeId);
  return { ok: true as const };
}

export async function deleteEmployeeNote(
  input: unknown,
): Promise<EmployeeNoteActionResult> {
  const parsed = employeeNoteDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid delete request." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return {
      ok: false as const,
      error:
        "We could not load your workspace. Sign in again, or verify configuration.",
    };
  }

  const { error } = await access.supabase
    .from("employee_notes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("employee_id", parsed.data.employeeId)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidateNoteSurfaces(parsed.data.employeeId);
  return { ok: true as const };
}
