"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/validators/auth";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export async function signInWithEmail(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Could not validate the sign-in form.";
    return { ok: false as const, error: msg };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false as const,
      error:
        error.message === "Invalid login credentials"
          ? "Invalid email or password."
          : error.message,
    };
  }

  return { ok: true };
}

export type SignUpActionResult =
  | { ok: true; pendingEmailVerification: boolean }
  | { ok: false; error: string };

export async function signUpWithEmail(
  input: unknown,
): Promise<SignUpActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Could not validate the signup form.";
    return { ok: false as const, error: msg };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    pendingEmailVerification: !data.session,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
