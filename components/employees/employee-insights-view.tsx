"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import {
  ArrowRightIcon,
  CalendarRangeIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  ClockIcon,
  FilePenLineIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatIsoDate } from "@/lib/format-dates";
import type { EmployeeRow } from "@/types/database";

export type EmployeeReviewCycleRow = {
  selfReviewId: string;
  cycleId: string;
  cycleTitle: string;
  cycleStatus: string;
  periodStart: string;
  periodEnd: string;
  selfReviewDue: string | null;
  selfStatus: "pending" | "submitted" | "late";
  selfSubmittedAt: string | null;
  remarkStatus: "none" | "draft" | "submitted" | "approved" | "archived";
  overallRating: number | null;
  remarkApprovedAt: string | null;
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function selfBadge(status: EmployeeReviewCycleRow["selfStatus"]): ReactElement {
  if (status === "submitted") {
    return (
      <Badge className="gap-1 border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
        <CheckCircle2Icon className="size-3" />
        Submitted
      </Badge>
    );
  }
  if (status === "late") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ClockIcon className="size-3" />
        Late
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 text-muted-foreground">
      <ClockIcon className="size-3" />
      Pending
    </Badge>
  );
}

function remarkBadge(
  status: EmployeeReviewCycleRow["remarkStatus"],
): ReactElement {
  switch (status) {
    case "approved":
      return (
        <Badge className="gap-1 border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <SparklesIcon className="size-3" />
          Approved
        </Badge>
      );
    case "submitted":
      return (
        <Badge className="gap-1 border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <ShieldCheckIcon className="size-3" />
          Awaiting approval
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="outline" className="gap-1">
          <FilePenLineIcon className="size-3" />
          In progress
        </Badge>
      );
    case "archived":
      return <Badge variant="secondary">Archived</Badge>;
    default:
      return (
        <span className="text-muted-foreground text-xs">Not started</span>
      );
  }
}

function cycleStatusBadge(status: string): ReactElement {
  if (status === "open")
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-800 dark:text-emerald-300">
        Open
      </Badge>
    );
  if (status === "closed")
    return (
      <Badge variant="secondary" className="font-normal">
        Closed
      </Badge>
    );
  if (status === "draft")
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/10 font-normal text-amber-800 dark:text-amber-200"
      >
        Draft
      </Badge>
    );
  return (
    <Badge variant="outline" className="font-normal">
      {status}
    </Badge>
  );
}

export function EmployeeInsightsView({
  employee,
  reviewRows,
  readOnly = false,
}: {
  employee: EmployeeRow;
  reviewRows: EmployeeReviewCycleRow[];
  readOnly?: boolean;
}): ReactElement {
  const latestApproved = reviewRows.find(
    (r) => r.remarkStatus === "approved" && r.overallRating != null,
  );
  const openCycles = reviewRows.filter((r) => r.cycleStatus === "open");
  const actionNeeded = reviewRows.filter(
    (r) =>
      r.cycleStatus === "open" &&
      (r.selfStatus === "pending" || r.selfStatus === "late" ||
        (r.selfStatus === "submitted" && r.remarkStatus !== "approved")),
  );

  return (
    <div className="relative mx-auto max-w-5xl space-y-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/6 absolute -top-20 right-0 h-64 w-[22rem] rounded-full blur-3xl" />
        <div className="bg-violet-500/8 absolute top-40 -left-16 h-48 w-48 rounded-full blur-3xl" />
      </div>

      {/* Profile */}
      <Card className="border-border/70 from-card/95 to-muted/12 relative overflow-hidden bg-gradient-to-br p-5 shadow-lg md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="bg-primary/14 text-primary border-primary/12 flex size-16 shrink-0 items-center justify-center rounded-2xl border text-lg font-semibold tracking-tight tabular-nums shadow-inner">
              {initials(employee.name)}
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                {employee.name}
              </h1>
              <p className="text-muted-foreground mt-1 truncate text-sm md:text-base">
                {employee.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {employee.employee_code?.trim() ? (
                  <Badge className="border-primary/14 bg-primary/8 text-primary font-normal tabular-nums">
                    ID · {employee.employee_code.trim()}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-normal">
                    Employee ID missing
                  </Badge>
                )}
                {employee.is_active === false ? (
                  <Badge
                    variant="outline"
                    className="font-normal text-muted-foreground"
                  >
                    Inactive
                  </Badge>
                ) : null}
                {employee.role ? (
                  <Badge variant="secondary" className="font-normal">
                    {employee.role}
                  </Badge>
                ) : null}
                {employee.team_name?.trim() ? (
                  <Badge variant="outline" className="font-normal">
                    Team · {employee.team_name.trim()}
                  </Badge>
                ) : null}
                {employee.department ? (
                  <Badge variant="outline" className="font-normal">
                    {employee.department}
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed">
                Review history is driven by{" "}
                <span className="text-foreground font-medium">self-review forms</span>{" "}
                and{" "}
                <span className="text-foreground font-medium">
                  manager remarks & approval
                </span>{" "}
                on each cycle — no separate notes or achievements are required on this
                page.
              </p>
            </div>
          </div>
          {latestApproved?.overallRating != null ? (
            <div className="border-border/60 bg-muted/20 shrink-0 rounded-2xl border px-5 py-4 text-center">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Latest approved rating
              </p>
              <p className="text-foreground mt-1 text-3xl font-semibold tabular-nums">
                <span className="text-amber-500">★</span>{" "}
                {latestApproved.overallRating}
                <span className="text-muted-foreground text-lg font-normal">
                  /5
                </span>
              </p>
              {latestApproved.remarkApprovedAt ? (
                <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                  Approved {formatIsoDate(latestApproved.remarkApprovedAt)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Quick summary */}
      {(openCycles.length > 0 || actionNeeded.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="bg-sky-500/15 text-sky-700 dark:text-sky-300 flex size-10 items-center justify-center rounded-xl">
                <CalendarRangeIcon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Open cycles
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {openCycles.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="bg-amber-500/15 text-amber-800 dark:text-amber-200 flex size-10 items-center justify-center rounded-xl">
                <ClipboardListIcon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Needs attention
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {actionNeeded.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="bg-violet-500/15 text-violet-800 dark:text-violet-200 flex size-10 items-center justify-center rounded-xl">
                <UsersIcon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Total cycles (this person)
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {reviewRows.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main table */}
      <Card className="border-border/70 shadow-md">
        <CardHeader className="border-border/60 border-b">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Review cycles</CardTitle>
              <CardDescription>
                Self-review and manager progress for each cycle this person is in.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" render={<Link href="/reviews" />} nativeButton={false}>
              All cycles
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {reviewRows.length === 0 ? (
            <div className="text-muted-foreground px-4 py-14 text-center text-sm md:px-6">
              <p>No review cycles yet for this employee.</p>
              <p className="mt-2">
                When an admin opens a cycle, a self-review form is created automatically.
              </p>
              <Button className="mt-4" render={<Link href="/reviews" />} nativeButton={false}>
                Go to reviews
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-border/60 bg-muted/30 border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 md:px-5">Review cycle</th>
                    <th className="px-4 py-3 md:px-5">Period</th>
                    <th className="px-4 py-3 md:px-5">State</th>
                    <th className="px-4 py-3 md:px-5">Self-review</th>
                    <th className="px-4 py-3 md:px-5">Manager review</th>
                    <th className="px-4 py-3 text-right md:px-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {reviewRows.map((row) => {
                    const canManage =
                      !readOnly &&
                      row.cycleStatus === "open" &&
                      row.selfStatus === "submitted";
                    const href = `/reviews/${row.cycleId}/${employee.id}`;
                    return (
                      <tr key={row.selfReviewId} className="hover:bg-muted/25">
                        <td className="px-4 py-3.5 align-top md:px-5">
                          <p className="font-medium leading-snug">{row.cycleTitle}</p>
                          {row.selfReviewDue ? (
                            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                              Due {formatIsoDate(row.selfReviewDue)}
                            </p>
                          ) : null}
                        </td>
                        <td className="text-muted-foreground px-4 py-3.5 align-top text-xs tabular-nums md:px-5">
                          {formatIsoDate(row.periodStart)} –{" "}
                          {formatIsoDate(row.periodEnd)}
                        </td>
                        <td className="px-4 py-3.5 align-top md:px-5">
                          {cycleStatusBadge(row.cycleStatus)}
                        </td>
                        <td className="px-4 py-3.5 align-top md:px-5">
                          <div className="flex flex-col gap-1">
                            {selfBadge(row.selfStatus)}
                            {row.selfSubmittedAt ? (
                              <span className="text-muted-foreground text-[11px] tabular-nums">
                                {formatIsoDate(row.selfSubmittedAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top md:px-5">
                          <div className="flex flex-col gap-1">
                            {remarkBadge(row.remarkStatus)}
                            {row.overallRating != null && row.remarkStatus === "approved" ? (
                              <span className="text-muted-foreground text-xs tabular-nums">
                                Rating {row.overallRating}/5
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right align-top md:px-5">
                          {row.cycleStatus === "closed" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              render={<Link href={href} />}
                              nativeButton={false}
                            >
                              View
                            </Button>
                          ) : canManage ? (
                            <Button
                              size="sm"
                              className="text-xs"
                              render={<Link href={href} />}
                              nativeButton={false}
                            >
                              {row.remarkStatus === "approved" ? "View" : "Review"}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              render={<Link href={href} />}
                              nativeButton={false}
                            >
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
