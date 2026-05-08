import type { ReactElement } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { WorkspaceMembersCard } from "@/components/settings/workspace-members-card";
import { WorkspaceHubCard } from "@/components/settings/workspace-hub";
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
  let workspaceOptions: Array<{ id: string; name: string }> = [];

  if (user) {
    const [profileRes, membersRes, myMembershipsRes] = await Promise.all([
      access.supabase
        .from("workspace_members")
        .select("role")
        .eq("org_id", access.orgId)
        .eq("user_id", user.id)
        .maybeSingle(),
      access.supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("org_id", access.orgId),
      access.supabase
        .from("workspace_members")
        .select("org_id")
        .eq("user_id", user.id),
    ]);

    if (
      profileRes.data?.role === "admin" ||
      profileRes.data?.role === "hr" ||
      profileRes.data?.role === "manager" ||
      profileRes.data?.role === "tl"
    ) {
      profileRole = profileRes.data.role;
    }
    const memberRows = (membersRes.data ?? []) as Array<{
      user_id: string;
      role: string;
    }>;
    const memberIds = memberRows.map((m) => m.user_id);
    const { data: profiles } = memberIds.length
      ? await access.supabase
          .from("user_profiles")
          .select("user_id, full_name")
          .in("user_id", memberIds)
      : { data: [] as Array<{ user_id: string; full_name: string }> };

    const idToName = new Map<string, string>(
      (profiles ?? []).map((p) => [p.user_id, p.full_name]),
    );

    members = memberRows
      .map((m) => ({
        id: m.user_id,
        full_name: idToName.get(m.user_id) ?? "Unknown",
        role: m.role as UserRole,
      }))
      .sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "", undefined, {
          sensitivity: "base",
        }),
      );

    const myOrgIds = ((myMembershipsRes.data ?? []) as Array<{ org_id: string }>).map(
      (m) => m.org_id,
    );
    if (myOrgIds.length >= 1) {
      const { data: orgs } = await access.supabase
        .from("organizations")
        .select("id, name")
        .in("id", myOrgIds);
      workspaceOptions = (orgs ?? [])
        .map((o) => ({ id: o.id as string, name: (o.name as string) ?? "Workspace" }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
  }

  const orgName = organization?.name ?? "Workspace";

  if (user && workspaceOptions.length === 0) {
    workspaceOptions = [{ id: access.orgId, name: orgName }];
  }

  const countryLabel =
    MANAGER_COUNTRIES.find((c) => c.code === organization?.country_code)?.name ??
    organization?.country_code ??
    "";

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Workspaces, organisation profile, members, and shortcuts."
      />
      <main className="relative flex flex-1 flex-col overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] xl:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-start">
            <div className="min-w-0 space-y-8">
              {user ? (
                <WorkspaceHubCard
                  activeOrgId={access.orgId}
                  activeOrgName={orgName}
                  options={workspaceOptions}
                />
              ) : null}
              <WorkspaceOrganizationSettings
                workspaceId={access.orgId}
                name={orgName}
                plan={organization?.plan ?? "free"}
                countryLabel={countryLabel}
                createdAt={organization?.created_at ?? null}
                canRename={profileRole === "admin" || profileRole === "hr"}
              />
              {user ? (
                <WorkspaceMembersCard
                  workspaceId={access.orgId}
                  members={members}
                  createdByUserId={organization?.created_by ?? null}
                  currentUserId={user.id}
                  canManageRoles={profileRole === "admin" || profileRole === "hr"}
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
