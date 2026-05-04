import type { ReactElement } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  SettingsQuickLinksCard,
  SettingsWorkspaceTipsCard,
  WorkspaceOrganizationSettings,
} from "@/components/settings/workspace-settings";
import { getOrgAccess } from "@/lib/org-context";

export default async function SettingsPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const {
    data: { user },
  } = await access.supabase.auth.getUser();

  const [{ data: organization }, { data: profile }] = await Promise.all([
    access.supabase
      .from("organizations")
      .select("name, plan, created_at")
      .eq("id", access.orgId)
      .maybeSingle(),
    user
      ? access.supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const orgName = organization?.name ?? "Workspace";

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Workspace identity, plan, and shortcuts to the rest of ReviewPilot."
      />
      <main className="relative flex flex-1 flex-col overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] xl:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-start">
            <WorkspaceOrganizationSettings
              workspaceId={access.orgId}
              name={orgName}
              plan={organization?.plan ?? "free"}
              createdAt={organization?.created_at ?? null}
              canRename={profile?.role === "admin"}
            />

            <aside className="flex flex-col gap-6">
              <SettingsQuickLinksCard />
              <SettingsWorkspaceTipsCard />
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
