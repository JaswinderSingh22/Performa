import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OrgSetupRequired } from "@/components/org-setup-required";
import { getOrgAccess } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function DashboardRouteGroupLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<React.ReactElement> {
  const access = await getOrgAccess();
  if (!access) {
    return <OrgSetupRequired />;
  }
  return <DashboardShell>{children}</DashboardShell>;
}
