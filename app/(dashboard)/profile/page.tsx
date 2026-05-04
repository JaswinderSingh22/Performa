import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProfilePage(): Promise<ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect("/login?next=/profile");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("full_name, role, job_title, department, years_experience, bio")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    redirect("/onboarding");
  }

  return (
    <>
      <DashboardHeader
        title="Profile"
        description="Personal details teammates see alongside your work."
      />
      <main className="flex flex-1 flex-col pt-2">
        <ProfileForm
          initial={{
            email: user.email,
            full_name: profile.full_name,
            role: profile.role,
            job_title: profile.job_title ?? "",
            department: profile.department ?? "",
            years_experience: profile.years_experience ?? null,
            bio: profile.bio ?? "",
          }}
        />
      </main>
    </>
  );
}
