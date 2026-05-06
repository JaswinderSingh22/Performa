"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/validators/onboarding";

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(
  input: unknown,
): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ??
      "Please check your organization details.";
    return { ok: false as const, error: msg };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, error: "You must be signed in to continue." };
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: parsed.data.organizationName,
      plan: "free",
      country_code: parsed.data.countryCode.trim().toUpperCase(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return {
      ok: false as const,
      error: orgError?.message ?? "Could not create your organization.",
    };
  }

  const fullName = parsed.data.fullName.trim();

  const [profileRes, memberRes] = await Promise.all([
    supabase.from("user_profiles").upsert({
      user_id: user.id,
      full_name: fullName,
      email: user.email ?? null,
    }),
    supabase.from("workspace_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "admin",
    }),
  ]);

  if (profileRes.error) {
    return {
      ok: false as const,
      error: profileRes.error.message,
    };
  }
  if (memberRes.error) {
    return { ok: false as const, error: memberRes.error.message };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_org_id", org.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

const profileSetupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name"),
  orgId: z.string().uuid("Invalid workspace."),
});

/**
 * For invited users: just save their name and activate the workspace they were invited to.
 * No org creation — they're already a workspace_member.
 */
export async function completeProfileSetup(
  input: unknown,
): Promise<OnboardingResult> {
  const parsed = profileSetupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, error: "You must be signed in to continue." };
  }

  // Verify the user genuinely belongs to this org (security check).
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", parsed.data.orgId)
    .maybeSingle();

  if (!membership) {
    return { ok: false as const, error: "You are not a member of this workspace." };
  }

  const { error: profileErr } = await supabase.from("user_profiles").upsert({
    user_id: user.id,
    full_name: parsed.data.fullName.trim(),
    email: user.email ?? null,
  });

  if (profileErr) {
    return { ok: false as const, error: profileErr.message };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_org_id", parsed.data.orgId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}
