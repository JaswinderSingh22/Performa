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

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const suggested =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof user.email === "string"
        ? (user.email.split("@")[0] ?? "")
        : "";

  return <OnboardingForm defaultFullName={suggested} />;
}
