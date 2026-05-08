import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MembershipRow = {
  org_id: string;
  employee_id: string | null;
  joined_at: string | null;
};

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: membershipRows, error: memErr } = await supabase
    .from("workspace_members")
    .select("org_id, role, employee_id, joined_at")
    .eq("user_id", user.id);

  if (memErr) {
    throw new Error(memErr.message);
  }

  const list = (membershipRows ?? []) as MembershipRow[];

  const pendingInvites = list.filter(
    (m) => m.employee_id != null && (m.joined_at == null || m.joined_at === ""),
  );

  if (pendingInvites.length >= 1) {
    const membership = pendingInvites[0]!;

    let fullName: string | null = null;
    if (membership.employee_id) {
      const { data: emp } = await supabase
        .from("employees")
        .select("name, email")
        .eq("id", membership.employee_id)
        .maybeSingle();
      fullName = emp?.name ?? null;
    }

    await supabase.from("user_profiles").upsert({
      user_id: user.id,
      full_name: fullName ?? user.email ?? "",
      email: user.email ?? null,
    });

    await supabase.rpc("mark_own_workspace_joined", {
      p_org_id: membership.org_id,
    });

    const cookieStore = await cookies();
    cookieStore.set("active_org_id", membership.org_id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });

    redirect("/employees");
  }

  if (list.length > 0) {
    redirect("/dashboard");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const suggested =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof user.email === "string"
        ? (user.email.split("@")[0] ?? "")
        : "";

  return <OnboardingForm defaultFullName={suggested} />;
}
