import type { ReactElement } from "react";

import { WorkspaceUsageOverview } from "@/components/billing/workspace-usage-overview";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { BillingPlansPanel } from "@/components/settings/billing-plans-panel";
import { getOrgAccess } from "@/lib/org-context";
import { getPublicRazorpayKeyId } from "@/lib/razorpay-server";

export default async function BillingPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const {
    data: { user },
  } = await access.supabase.auth.getUser();

  const [
    orgRes,
    membershipRes,
    empCountRes,
    achCountRes,
    noteCountRes,
    reviewCountRes,
  ] = await Promise.all([
    access.supabase
      .from("organizations")
      .select("plan, subscription_status, billing_interval")
      .eq("id", access.orgId)
      .maybeSingle(),
    user
      ? access.supabase
          .from("workspace_members")
          .select("role")
          .eq("org_id", access.orgId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    access.supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("org_id", access.orgId),
    access.supabase
      .from("achievements")
      .select("id", { count: "exact", head: true })
      .eq("org_id", access.orgId),
    access.supabase
      .from("employee_notes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", access.orgId),
    access.supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("org_id", access.orgId),
  ]);

  const razorpayReady = Boolean(getPublicRazorpayKeyId());

  return (
    <>
      <DashboardHeader
        title="Billing & usage"
        description="Seat usage, workspace totals, and plan upgrades."
      />
      <main className="flex-1 overflow-x-auto p-6 pb-14 space-y-10">
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Usage overview
          </h2>
          <WorkspaceUsageOverview
            organization={orgRes.data}
            counts={{
              employees: empCountRes.count ?? 0,
              achievements: achCountRes.count ?? 0,
              notes: noteCountRes.count ?? 0,
              reviews: reviewCountRes.count ?? 0,
            }}
          />
        </section>
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Plans & payment
          </h2>
          <BillingPlansPanel
            workspacePlan={orgRes.data?.plan ?? "free"}
            subscriptionStatus={orgRes.data?.subscription_status ?? "none"}
            billingInterval={
              (orgRes.data?.billing_interval as "month" | "year" | null) ??
              null
            }
            canManageBilling={membershipRes.data?.role === "admin"}
            razorpayReady={razorpayReady}
          />
        </section>
      </main>
    </>
  );
}
