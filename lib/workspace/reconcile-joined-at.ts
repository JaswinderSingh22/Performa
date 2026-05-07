import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/admin";

/**
 * Persist workspace_members.joined_at from Auth users who already have sessions.
 * RLS prevents clients from updating memberships; invites set invited_at but joined_at stayed null until this runs.
 */
export async function reconcileWorkspaceJoinedFromAuth(orgId: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  let admin;
  try {
    admin = createServiceRoleSupabase();
  } catch {
    return;
  }

  const { data: rows, error } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("org_id", orgId)
    .not("invited_at", "is", null)
    .is("joined_at", null)
    .not("user_id", "is", null);

  if (error || !rows?.length) return;

  for (const row of rows.slice(0, 64)) {
    const uid = row.user_id as string;
    try {
      const { data: authRes, error: guErr } = await admin.auth.admin.getUserById(uid);
      if (guErr || !authRes?.user) continue;
      const lastIn =
        authRes.user.last_sign_in_at ??
        authRes.user.email_confirmed_at ??
        authRes.user.confirmed_at;
      if (!lastIn) continue;
      await admin
        .from("workspace_members")
        .update({ joined_at: lastIn })
        .eq("org_id", orgId)
        .eq("user_id", uid)
        .is("joined_at", null);
    } catch {
      /* ignore per-user failures */
    }
  }
}
