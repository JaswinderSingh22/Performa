"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
import { sendWorkspaceInviteEmail } from "@/lib/email";
import { createServiceRoleSupabase } from "@/lib/supabase/admin";
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
 * Resolve an auth user id via GoTrue Admin API.
 * The `filter` query must use PostgREST form: email.eq.full@address — not raw email alone.
 */
async function lookupAuthUserByEmail(email: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const normalized = email.trim().toLowerCase();
  if (!supabaseUrl || !serviceKey || !normalized) return null;

  async function fetchWithFilter(filter: string): Promise<string | null> {
    try {
      const filterParam = encodeURIComponent(filter);
      const res = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?filter=${filterParam}&per_page=2`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as {
        users?: Array<{ id: string; email?: string | null }>;
      };
      const users = json.users ?? [];
      const hit =
        users.find((u) => (u.email ?? "").trim().toLowerCase() === normalized) ??
        users[0];
      return hit?.id ?? null;
    } catch {
      return null;
    }
  }

  let id = await fetchWithFilter(`email.eq.${normalized}`);

  if (!id) {
    try {
      const admin = createServiceRoleSupabase();
      const perPage = 500;
      for (let page = 1; page <= 40; page++) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error || !data?.users?.length) break;
        const hit = data.users.find(
          (u) => (u.email ?? "").trim().toLowerCase() === normalized,
        );
        if (hit) return hit.id;
        if (data.users.length < perPage) break;
      }
    } catch {
      return null;
    }
  }

  return id;
}

/** Supabase attaches this redirect after completing the emailed auth link flow. Must be in Auth → URL Configuration. */
function authInviteRedirectTo(): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/auth/callback`;
}

function looksLikeExistingUserInviteError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already registered") ||
    m.includes("email address is already") ||
    m.includes("email already exists") ||
    m.includes("already exists") ||
    m.includes("duplicate")
  );
}

async function deliverWorkspaceInviteViaResendMagicLink(
  admin: ReturnType<typeof createServiceRoleSupabase>,
  params: {
    email: string;
    redirectTo: string;
    employeeName: string;
    workspaceName: string;
    accessRoleLabel: string;
  },
): Promise<EmployeeAccessResult> {
  const { data: gen, error: genErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: params.email,
    options: { redirectTo: params.redirectTo },
  });

  const actionLink = gen?.properties?.action_link ?? "";
  if (genErr || !actionLink.trim()) {
    return {
      ok: false,
      error:
        genErr?.message ??
        "Could not generate a magic sign-in link. Check Supabase Auth redirect URLs.",
    };
  }

  const sent = await sendWorkspaceInviteEmail({
    to: params.email,
    employeeName: params.employeeName,
    workspaceName: params.workspaceName,
    accessRoleLabel: params.accessRoleLabel,
    signInLink: actionLink,
  });

  if (!sent.success)
    return { ok: false, error: sent.error ?? "Invitation email failed to send." };

  return { ok: true };
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
  if (!parsed.success) {
    const err = parsed.error.issues[0]?.message ?? "Invalid invite request.";
    return { ok: false, error: err };
  }

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
  const workspaceName = org?.name ?? "your workspace";
  const redirectTo = authInviteRedirectTo();

  const inviteMetadata = {
    full_name: employee.name,
    workspace_name: workspaceName,
    access_role: accessRoleLabel,
    position: employee.role ?? "",
  };

  const { data: wmRow } = await admin
    .from("workspace_members")
    .select("user_id, joined_at")
    .eq("org_id", access.orgId)
    .eq("employee_id", employee.id)
    .maybeSingle();

  let invitedUserId = (wmRow?.user_id as string | undefined) ?? null;
  let queuedSupabaseInviteEmail = false;
  let seedJoinedAt: string | undefined;

  if (!invitedUserId) {
    const inviteRes = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: inviteMetadata,
    });

    if (inviteRes.data?.user?.id && !inviteRes.error) {
      invitedUserId = inviteRes.data.user.id;
      queuedSupabaseInviteEmail = true;
    } else if (
      inviteRes.error &&
      looksLikeExistingUserInviteError(inviteRes.error.message)
    ) {
      invitedUserId = await lookupAuthUserByEmail(email);
      if (!invitedUserId)
        return { ok: false, error: inviteRes.error.message };

      seedJoinedAt = new Date().toISOString();
    } else if (inviteRes.error) {
      return { ok: false, error: inviteRes.error.message };
    } else {
      invitedUserId = await lookupAuthUserByEmail(email);
      if (!invitedUserId) {
        return {
          ok: false,
          error: "Could not create or find an auth user for this email.",
        };
      }

      seedJoinedAt = new Date().toISOString();
    }
  }

  if (!invitedUserId) {
    return { ok: false, error: "Could not resolve a login for this employee." };
  }

  await admin.from("user_profiles").upsert({
    user_id: invitedUserId,
    full_name: employee.name,
    email,
  });

  const joinedAtPayload =
    wmRow?.joined_at != null && String(wmRow.joined_at).length > 0
      ? { joined_at: wmRow.joined_at as string }
      : seedJoinedAt
        ? { joined_at: seedJoinedAt }
        : {};

  const { error: memberErr } = await admin.from("workspace_members").upsert({
    org_id: access.orgId,
    user_id: invitedUserId,
    role: parsed.data.role,
    employee_id: employee.id,
    invited_at: new Date().toISOString(),
    invited_by: actorId,
    ...joinedAtPayload,
  });

  if (memberErr) return { ok: false, error: memberErr.message };

  const useResendMagicLink =
    !queuedSupabaseInviteEmail ||
    process.env.WORKSPACE_INVITE_ALWAYS_RESEND === "1";

  if (useResendMagicLink) {
    const mailRes = await deliverWorkspaceInviteViaResendMagicLink(admin, {
      email,
      redirectTo,
      employeeName: employee.name,
      workspaceName,
      accessRoleLabel,
    });

    if (!mailRes.ok) return mailRes;
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${employee.id}`);
  revalidatePath(`/employees/${employee.id}/insights`);
  revalidatePath("/settings");
  return { ok: true };
}

