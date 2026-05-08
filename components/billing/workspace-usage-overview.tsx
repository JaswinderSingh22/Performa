import type { ReactElement } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export type WorkspaceUsageCounts = {
  employees: number;
  achievements: number;
  notes: number;
  reviews: number;
};

type OrgSnippet = {
  plan: string | null | undefined;
  subscription_status?: string | null;
  billing_interval?: string | null;
};

/** Plan capacity + workspace totals (shown above plan selection on Billing). */
export function WorkspaceUsageOverview({
  organization,
  counts,
}: {
  organization: OrgSnippet | null | undefined;
  counts: WorkspaceUsageCounts;
}): ReactElement {
  const plan = normalizePlan(organization?.plan);
  const config = getPlanConfig(plan);
  const employeesUsed = counts.employees;

  const seatsCap =
    config.maxEmployees === "unlimited"
      ? Number.MAX_SAFE_INTEGER
      : config.maxEmployees;
  const seatsLeft =
    seatsCap !== Number.MAX_SAFE_INTEGER
      ? Math.max(0, seatsCap - employeesUsed)
      : null;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Current plan & seats</CardTitle>
          <CardDescription>
            {planLabel(plan)} · {organization?.subscription_status ?? "none"}
            {organization?.billing_interval
              ? ` · billed ${organization.billing_interval}`
              : ""}
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
            <p className="text-lg font-semibold tabular-nums">
              {counts.achievements}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg border border-border/60 p-3">
            <p className="text-muted-foreground text-xs">Notes</p>
            <p className="text-lg font-semibold tabular-nums">{counts.notes}</p>
          </div>
          <div className="bg-muted/20 rounded-lg border border-border/60 p-3">
            <p className="text-muted-foreground text-xs">Reviews</p>
            <p className="text-lg font-semibold tabular-nums">{counts.reviews}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
