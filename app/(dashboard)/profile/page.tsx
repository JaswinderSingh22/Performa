import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getOrgAccess } from "@/lib/org-context";

export default async function ProfilePage(): Promise<ReactElement> {
  const access = await getOrgAccess();
  if (!access) redirect("/login?next=/profile");

  const {
    data: { user },
  } = await access.supabase.auth.getUser();
  if (!user?.email) {
    redirect("/login?next=/profile");
  }

  const [{ data: profile, error }, { data: membership }] = await Promise.all([
    access.supabase
      .from("user_profiles")
      .select("full_name, job_title, department, years_experience, bio")
      .eq("user_id", user.id)
      .maybeSingle(),
    access.supabase
      .from("workspace_members")
      .select("role")
      .eq("org_id", access.orgId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

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
            role: (membership?.role ?? "manager") as string,
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
