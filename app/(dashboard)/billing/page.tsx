import type { ReactElement } from "react";

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

  const [{ data: organization }, { data: profile }] = await Promise.all([
    access.supabase
      .from("organizations")
      .select("plan, subscription_status")
      .eq("id", access.orgId)
      .maybeSingle(),
    user
      ? access.supabase.from("users").select("role").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const razorpayReady = Boolean(getPublicRazorpayKeyId());

  return (
    <>
      <DashboardHeader
        title="Billing"
        description="Manage workspace plans and payment details."
      />
      <main className="flex-1 overflow-x-auto p-6">
        <BillingPlansPanel
          workspacePlan={organization?.plan ?? "free"}
          subscriptionStatus={organization?.subscription_status ?? "none"}
          canManageBilling={profile?.role === "admin"}
          razorpayReady={razorpayReady}
        />
      </main>
    </>
  );
}
