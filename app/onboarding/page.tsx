import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  // Check if this user was invited into an existing workspace.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("org_id, role, employee_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.org_id) {
    // Invited user — look up their name from the employee record (already entered by admin).
    let fullName: string | null = null;
    if (membership.employee_id) {
      const { data: emp } = await supabase
        .from("employees")
        .select("name, email")
        .eq("id", membership.employee_id)
        .maybeSingle();
      fullName = emp?.name ?? null;
    }

    // Auto-create their profile from the employee record — no form needed.
    await supabase.from("user_profiles").upsert({
      user_id: user.id,
      full_name: fullName ?? user.email ?? "",
      email: user.email ?? null,
    });

    await supabase.rpc("mark_own_workspace_joined", {
      p_org_id: membership.org_id as string,
    });

    const cookieStore = await cookies();
    cookieStore.set("active_org_id", membership.org_id as string, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });

    redirect("/employees");
  }

  // New org creator — show the full setup form.
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const suggested =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof user.email === "string"
        ? (user.email.split("@")[0] ?? "")
        : "";

  return <OnboardingForm defaultFullName={suggested} />;
}
