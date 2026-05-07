"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
import { createServiceRoleSupabase } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export type EmployeeAccessResult = { ok: true } | { ok: false; error: string };

const setAccessSchema = z.object({
  employeeId: z.string().uuid(),
  // "none" means remove access (delete membership for this employee mapping)
  role: z.enum(["none", "admin", "hr", "manager", "tl"]),
});

function isAdminLike(role: string | null | undefined): boolean {
  return role === "admin" || role === "hr";
}

/**
 * Look up a Supabase auth user id by email via the GoTrue Admin REST endpoint.
 * Using admin.schema("auth").from("users") does NOT work — PostgREST only exposes
 * the public schema, not the auth schema managed by GoTrue.
 */
async function lookupAuthUserByEmail(email: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) return null;
  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { users?: Array<{ id: string }> };
    return json.users?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function ensureAdminLike(): Promise<
  | { ok: true; access: NonNullable<Awaited<ReturnType<typeof getOrgAccess>>>; userId: string }
  | { ok: false; error: string }
> {
  const access = await getOrgAccess();
  if (!access) return { ok: false, error: "We could not load your workspace." };

  const {
    data: { user },
    error: userError,
  } = await access.supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in." };

  const { data: membership } = await access.supabase
    .from("workspace_members")
    .select("role")
    .eq("org_id", access.orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isAdminLike((membership?.role as string | null) ?? null)) {
    return { ok: false, error: "Only Admin/HR can manage workspace access." };
  }

  return { ok: true, access, userId: user.id };
}

export async function setEmployeeWorkspaceAccess(
  input: unknown,
): Promise<EmployeeAccessResult> {
  const parsed = setAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid access update." };

  const gate = await ensureAdminLike();
  if (!gate.ok) return gate;
  const access = gate.access;

  const { data: employee } = await access.supabase
    .from("employees")
    .select("id")
    .eq("org_id", access.orgId)
    .eq("id", parsed.data.employeeId)
    .maybeSingle();

  if (!employee?.id) return { ok: false, error: "Employee not found." };

  const admin = createServiceRoleSupabase();

  if (parsed.data.role === "none") {
    const { error } = await admin
      .from("workspace_members")
      .delete()
      .eq("org_id", access.orgId)
      .eq("employee_id", parsed.data.employeeId);
    if (error) return { ok: false, error: error.message };
  } else {
    // Role changes without invite are only allowed if we already have a membership row.
    // (We don't know the user_id for this employee otherwise.)
    const { data: existing } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("org_id", access.orgId)
      .eq("employee_id", parsed.data.employeeId)
      .maybeSingle();
    if (!existing?.user_id) {
      return {
        ok: false,
        error: "No login is linked to this employee yet. Send an invite first.",
      };
    }
    const { error } = await admin
      .from("workspace_members")
      .update({ role: parsed.data.role })
      .eq("org_id", access.orgId)
      .eq("user_id", existing.user_id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${parsed.data.employeeId}`);
  revalidatePath(`/employees/${parsed.data.employeeId}/insights`);
  revalidatePath("/settings");
  return { ok: true };
}

const inviteSchema = z.object({
  employeeId: z.string().uuid(),
  role: z.enum(["admin", "hr", "manager", "tl"]),
});

export async function inviteEmployeeToWorkspace(
  input: unknown,
): Promise<EmployeeAccessResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite request." };

  const gate = await ensureAdminLike();
  if (!gate.ok) return gate;
  const access = gate.access;
  const actorId = gate.userId;

  const { data: employee } = await access.supabase
    .from("employees")
    .select("id, name, email, role")
    .eq("org_id", access.orgId)
    .eq("id", parsed.data.employeeId)
    .maybeSingle();

  if (!employee?.id) return { ok: false, error: "Employee not found." };
  const email = employee.email?.trim().toLowerCase() ?? "";
  if (!email) return { ok: false, error: "Employee does not have an email." };

  // Fetch org name for the invite email.
  const { data: org } = await access.supabase
    .from("organizations")
    .select("name")
    .eq("id", access.orgId)
    .maybeSingle();

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    hr: "HR",
    manager: "Manager",
    tl: "Team Lead",
  };
  const accessRoleLabel = roleLabels[parsed.data.role] ?? parsed.data.role;

  const admin = createServiceRoleSupabase();

  // If already linked to an auth user in this workspace, don't try to invite again.
  // This prevents duplicate calls from throwing "already registered".
  const { data: existingLink } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("org_id", access.orgId)
    .eq("employee_id", employee.id)
    .maybeSingle();
  if (existingLink?.user_id) {
    const { data: wm } = await admin
      .from("workspace_members")
      .select("joined_at")
      .eq("org_id", access.orgId)
      .eq("user_id", existingLink.user_id)
      .maybeSingle();

    const joinedAt =
      (wm?.joined_at as string | null | undefined) ?? new Date().toISOString();

    const { error: updateErr } = await admin.from("workspace_members").upsert({
      org_id: access.orgId,
      user_id: existingLink.user_id,
      role: parsed.data.role,
      employee_id: employee.id,
      invited_at: new Date().toISOString(),
      invited_by: actorId,
      joined_at: joinedAt,
    });
    if (updateErr) return { ok: false, error: updateErr.message };

    revalidatePath("/employees");
    revalidatePath(`/employees/${employee.id}`);
    revalidatePath(`/employees/${employee.id}/insights`);
    revalidatePath("/settings");
    return { ok: true };
  }

  // Invite (or re-invite). For already-registered users, inviteUserByEmail returns 422.
  // In that case we fall back to looking up the existing auth user and linking them directly.
  const inviteRes = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: employee.name,
      workspace_name: org?.name ?? "your workspace",
      access_role: accessRoleLabel,
      position: employee.role ?? "",
    },
  });

  let invitedUserId = inviteRes.data?.user?.id ?? null;
  const inviteErr = inviteRes.error?.message ?? "";

  let seedJoinedAt: string | undefined;
  if (!invitedUserId) {
    invitedUserId = await lookupAuthUserByEmail(email);
    if (invitedUserId) {
      seedJoinedAt = new Date().toISOString();
    }
    if (!invitedUserId) {
      return { ok: false, error: inviteErr || "Could not find or invite user." };
    }
  }

  // Ensure global profile exists for display in Settings.
  await admin.from("user_profiles").upsert({
    user_id: invitedUserId,
    full_name: employee.name,
    email,
  });

  // Create/update membership linked to employee.
  const { error: memberErr } = await admin.from("workspace_members").upsert({
    org_id: access.orgId,
    user_id: invitedUserId,
    role: parsed.data.role,
    employee_id: employee.id,
    invited_at: new Date().toISOString(),
    invited_by: actorId,
    ...(seedJoinedAt ? { joined_at: seedJoinedAt } : {}),
  });

  if (memberErr) return { ok: false, error: memberErr.message };

  revalidatePath("/employees");
  revalidatePath(`/employees/${employee.id}`);
  revalidatePath(`/employees/${employee.id}/insights`);
  revalidatePath("/settings");
  return { ok: true };
}

