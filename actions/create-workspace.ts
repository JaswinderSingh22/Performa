"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createWorkspaceSchema } from "@/validators/onboarding";

export type CreateWorkspaceResult =
  | { ok: true; orgId: string }
  | { ok: false; error: string };

/**
 * Create a new workspace and make the current user its Admin.
 * Does not change user profile name; updates email on profile if missing only.
 */
export async function createWorkspace(
  input: unknown,
): Promise<CreateWorkspaceResult> {
  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Check workspace details.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: parsed.data.organizationName.trim(),
      plan: "free",
      country_code: parsed.data.countryCode.trim().toUpperCase(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return {
      ok: false as const,
      error: orgError?.message ?? "Could not create the workspace.",
    };
  }

  const { error: memberErr } = await supabase.from("workspace_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
    joined_at: new Date().toISOString(),
  });

  if (memberErr) {
    return { ok: false as const, error: memberErr.message };
  }

  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: profileErr } = await supabase.from("user_profiles").upsert({
    user_id: user.id,
    full_name:
      existingProfile?.full_name?.trim() ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email ?? null,
  });

  if (profileErr) {
    return { ok: false as const, error: profileErr.message };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_org_id", org.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  revalidatePath("/", "layout");
  return { ok: true as const, orgId: org.id };
}
