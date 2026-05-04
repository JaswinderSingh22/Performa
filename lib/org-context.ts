import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { createServiceRoleSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OrgAccess = {
  readonly orgId: string;
  readonly supabase: SupabaseClient;
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
    const { data: profile, error } = await serverClient
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !profile?.org_id) {
      return null;
    }
    return { orgId: profile.org_id, supabase: serverClient };
  }

  const devOrg = process.env.DEV_ORG_ID;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    process.env.NODE_ENV === "development" &&
    devOrg &&
    serviceRole &&
    devOrg.length > 0
  ) {
    return { orgId: devOrg, supabase: createServiceRoleSupabase() };
  }

  return null;
}

export const getOrgAccess = cache(resolveOrgAccess);
