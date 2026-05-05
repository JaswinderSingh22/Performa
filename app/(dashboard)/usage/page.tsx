import type { ReactElement } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrgAccess } from "@/lib/org-context";
import { getPlanConfig, isUnlimitedLimit, normalizePlan, planLabel } from "@/lib/plans";

function percent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

function meterClass(used: number, limit: number): string {
  if (limit <= 0) return "bg-emerald-500";
  const p = used / limit;
  if (p >= 0.9) return "bg-rose-500";
  if (p >= 0.7) return "bg-amber-500";
  return "bg-emerald-500";
}

export default async function UsagePage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;
  const [{ data: org }, empCountRes, achCountRes, noteCountRes, reviewCountRes] =
    await Promise.all([
      access.supabase
        .from("organizations")
        .select("plan, subscription_status, billing_interval")
        .eq("id", access.orgId)
        .maybeSingle(),
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

  const plan = normalizePlan(org?.plan);
  const config = getPlanConfig(plan);

  const employeesUsed = empCountRes.count ?? 0;
  const seatsCap =
    config.maxEmployees === "unlimited" ? Number.MAX_SAFE_INTEGER : config.maxEmployees;
  const seatsLeft = isUnlimitedLimit(seatsCap)
    ? null
    : Math.max(0, seatsCap - employeesUsed);

  return (
    <>
      <DashboardHeader
        title="Usage"
        description="Track plan capacity and workspace usage."
      />
      <main className="flex-1 overflow-x-auto p-6 pb-14">
        <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Current plan</CardTitle>
              <CardDescription>
                {planLabel(plan)} · {org?.subscription_status ?? "none"}{" "}
                {org?.billing_interval ? `· billed ${org.billing_interval}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Directory seats</p>
                <p className="text-muted-foreground text-sm">
                  {isUnlimitedLimit(seatsCap)
                    ? `${employeesUsed} used · unlimited seats`
                    : `${employeesUsed}/${seatsCap} used · ${seatsLeft ?? 0} remaining`}
                </p>
                {!isUnlimitedLimit(seatsCap) ? (
                  <div className="bg-muted h-2.5 rounded-full">
                    <div
                      className={`h-2.5 rounded-full ${meterClass(employeesUsed, seatsCap)}`}
                      style={{ width: `${percent(employeesUsed, seatsCap)}%` }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">AI roll-ups</p>
                <p className="text-muted-foreground text-sm">
                  AI-powered roll-ups included
                </p>
                <p className="text-muted-foreground text-xs">Fair usage applies</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Workspace totals</CardTitle>
              <CardDescription>
                Current records in your workspace (informational).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="bg-muted/20 rounded-lg border border-border/60 p-3">
                <p className="text-muted-foreground text-xs">Employees</p>
                <p className="text-lg font-semibold tabular-nums">{employeesUsed}</p>
              </div>
              <div className="bg-muted/20 rounded-lg border border-border/60 p-3">
                <p className="text-muted-foreground text-xs">Achievements</p>
                <p className="text-lg font-semibold tabular-nums">{achCountRes.count ?? 0}</p>
              </div>
              <div className="bg-muted/20 rounded-lg border border-border/60 p-3">
                <p className="text-muted-foreground text-xs">Notes</p>
                <p className="text-lg font-semibold tabular-nums">{noteCountRes.count ?? 0}</p>
              </div>
              <div className="bg-muted/20 rounded-lg border border-border/60 p-3">
                <p className="text-muted-foreground text-xs">Reviews</p>
                <p className="text-lg font-semibold tabular-nums">{reviewCountRes.count ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
