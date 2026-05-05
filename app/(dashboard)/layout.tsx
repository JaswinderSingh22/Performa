import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OrgSetupRequired } from "@/components/org-setup-required";
import { computeBillingState, maybeDowngradeExpiredOrg } from "@/lib/billing/getBillingState";
import { getOrgAccess } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function DashboardRouteGroupLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<React.ReactElement> {
  const access = await getOrgAccess();
  if (!access) {
    return <OrgSetupRequired />;
  }
  const { data: org } = await access.supabase
    .from("organizations")
    .select("id, plan, subscription_status, subscription_current_end, razorpay_subscription_id")
    .eq("id", access.orgId)
    .maybeSingle();

  const billingState = org ? computeBillingState(org) : null;
  if (org) {
    await maybeDowngradeExpiredOrg(org);
  }
  return <DashboardShell billingState={billingState}>{children}</DashboardShell>;
}
