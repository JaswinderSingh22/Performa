"use server";

import { revalidatePath } from "next/cache";

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

  const { error: profileError } = await supabase.from("users").insert({
    id: user.id,
    org_id: org.id,
    full_name: parsed.data.fullName,
    role: "admin",
  });

  if (profileError) {
    return {
      ok: false as const,
      error: profileError.message,
    };
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
