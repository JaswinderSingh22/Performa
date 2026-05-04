import type { ReactElement } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { BillingPlansPanel } from "@/components/settings/billing-plans-panel";
import {
  SettingsQuickLinksCard,
  SettingsWorkspaceTipsCard,
  WorkspaceOrganizationSettings,
} from "@/components/settings/workspace-settings";
import { MANAGER_COUNTRIES } from "@/lib/countries";
import { getOrgAccess } from "@/lib/org-context";
import { getPublicRazorpayKeyId } from "@/lib/razorpay-server";

export default async function SettingsPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const {
    data: { user },
  } = await access.supabase.auth.getUser();

  const [{ data: organization }, { data: profile }] = await Promise.all([
    access.supabase
      .from("organizations")
      .select("name, plan, created_at, country_code, subscription_status")
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

  const countryLabel =
    MANAGER_COUNTRIES.find((c) => c.code === organization?.country_code)?.name ??
    organization?.country_code ??
    "";

  const razorpayReady = Boolean(getPublicRazorpayKeyId());

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Workspace identity, plans, and shortcuts for Performa."
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
                canRename={profile?.role === "admin"}
              />
              <BillingPlansPanel
                workspacePlan={organization?.plan ?? "free"}
                subscriptionStatus={organization?.subscription_status ?? "none"}
                canManageBilling={profile?.role === "admin"}
                razorpayReady={razorpayReady}
              />
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
