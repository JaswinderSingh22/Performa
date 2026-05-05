import type { ReactElement } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { WorkspaceMembersCard } from "@/components/settings/workspace-members-card";
import {
  SettingsQuickLinksCard,
  SettingsWorkspaceTipsCard,
  WorkspaceOrganizationSettings,
} from "@/components/settings/workspace-settings";
import { MANAGER_COUNTRIES } from "@/lib/countries";
import { getOrgAccess } from "@/lib/org-context";
import type { UserRole } from "@/types/database";

export default async function SettingsPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const {
    data: { user },
  } = await access.supabase.auth.getUser();

  const { data: organization } = await access.supabase
    .from("organizations")
    .select("name, plan, created_at, country_code, created_by")
    .eq("id", access.orgId)
    .maybeSingle();

  let profileRole: UserRole | undefined;
  let members: { id: string; full_name: string; role: UserRole }[] = [];

  if (user) {
    const [profileRes, membersRes] = await Promise.all([
      access.supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
      access.supabase
        .from("users")
        .select("id, full_name, role")
        .eq("org_id", access.orgId)
        .order("full_name"),
    ]);

    if (profileRes.data?.role === "admin" || profileRes.data?.role === "manager") {
      profileRole = profileRes.data.role;
    }
    members = (membersRes.data ?? []).map((row) => ({
      ...row,
      role: row.role as UserRole,
    }));
  }

  const orgName = organization?.name ?? "Workspace";

  const countryLabel =
    MANAGER_COUNTRIES.find((c) => c.code === organization?.country_code)?.name ??
    organization?.country_code ??
    "";

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Workspace identity, members, and shortcuts."
      />
      <main className="relative flex flex-1 flex-col overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] xl:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-start">
            <div className="min-w-0 space-y-8">
              <WorkspaceOrganizationSettings
                workspaceId={access.orgId}
                name={orgName}
                plan={organization?.plan ?? "free"}
                countryLabel={countryLabel}
                createdAt={organization?.created_at ?? null}
                canRename={profileRole === "admin"}
              />
              {user ? (
                <WorkspaceMembersCard
                  members={members}
                  createdByUserId={organization?.created_by ?? null}
                  currentUserId={user.id}
                  canManageRoles={profileRole === "admin"}
                />
              ) : null}
            </div>

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
