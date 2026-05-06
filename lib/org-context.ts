import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { createServiceRoleSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OrgAccess = {
  readonly orgId: string;
  readonly supabase: SupabaseClient;
  /** Workspace role of the signed-in user (null in dev-bypass mode). */
  readonly role: string | null;
  /** The employee record linked to this user (null for org owners not added as employees). */
  readonly employeeId: string | null;
};

/**
 * Resolved org + Supabase client for authenticated users (RLS-aware).
 * In development only, optionally falls back to a fixed org via env when unauthenticated—disable for production builds that must require sign-in.
 */
async function resolveOrgAccess(): Promise<OrgAccess | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  const serverClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (user) {
    const { data: memberships, error } = await serverClient
      .from("workspace_members")
      .select("org_id, role, employee_id")
      .eq("user_id", user.id);
    if (error) {
      return null;
    }
    const orgIds = (memberships ?? [])
      .map((m) => m.org_id as string | null)
      .filter((v): v is string => Boolean(v));
    if (orgIds.length === 0) {
      return null;
    }

    const cookieStore = await cookies();
    const active = cookieStore.get("active_org_id")?.value ?? "";
    const resolved = active && orgIds.includes(active) ? active : orgIds[0]!;
    const activeMembership = (memberships ?? []).find(
      (m) => (m.org_id as string) === resolved,
    );
    return {
      orgId: resolved,
      supabase: serverClient,
      role: (activeMembership?.role as string | null) ?? null,
      employeeId: (activeMembership?.employee_id as string | null) ?? null,
    };
  }

  const devOrg = process.env.DEV_ORG_ID;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    process.env.NODE_ENV === "development" &&
    devOrg &&
    serviceRole &&
    devOrg.length > 0
  ) {
    return { orgId: devOrg, supabase: createServiceRoleSupabase(), role: "admin", employeeId: null };
  }

  return null;
}

export const getOrgAccess = cache(resolveOrgAccess);
