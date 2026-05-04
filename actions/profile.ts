"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/validators/profile";

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(
  input: unknown,
): Promise<ProfileActionResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ??
      "Please review the highlighted fields.";
    return { ok: false as const, error: msg };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      ok: false as const,
      error: "You must be signed in to update your profile.",
    };
  }

  const { error } = await supabase
    .from("users")
    .update({
      full_name: parsed.data.fullName.trim(),
      job_title: parsed.data.jobTitle.trim(),
      department: parsed.data.department.trim(),
      bio: parsed.data.bio.trim(),
      years_experience: parsed.data.yearsExperience,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
