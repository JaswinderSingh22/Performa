import Link from "next/link";
import type { ReactElement } from "react";
import {
  CalendarRangeIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  FilePenLineIcon,
  LockIcon,
  SendIcon,
} from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { CreateCycleDialog } from "@/components/reviews/create-cycle-dialog";
import { Badge } from "@/components/ui/badge";
import { getOrgAccess } from "@/lib/org-context";
import type { ReviewCycleRow } from "@/types/database";

function statusConfig(status: ReviewCycleRow["status"]) {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        icon: FilePenLineIcon,
        className: "bg-muted/60 text-muted-foreground border-border/60",
      };
    case "open":
      return {
        label: "Open · Collecting",
        icon: SendIcon,
        className: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/20",
      };
    case "reviewing":
      return {
        label: "In review",
        icon: ClockIcon,
        className: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/20",
      };
    case "closed":
      return {
        label: "Closed",
        icon: CheckCircle2Icon,
        className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      };
  }
}

function cadenceLabel(c: string) {
  const map: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    mid_year: "Mid-year",
    yearly: "Yearly",
  };
  return map[c] ?? c;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ReviewsPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const isAdminLike = access.role === "admin" || access.role === "hr";

  const [{ data: cycles, error }, { data: teamsData, error: teamsErr }] =
    await Promise.all([
      access.supabase
        .from("review_cycles")
        .select("*")
        .eq("org_id", access.orgId)
        .order("created_at", { ascending: false }),
      access.supabase
        .from("teams")
        .select("name")
        .eq("org_id", access.orgId)
        .order("name", { ascending: true }),
    ]);

  if (error) throw new Error(error.message);
  if (teamsErr) throw new Error(teamsErr.message);

  const teamOptions = (teamsData ?? []).map((row) => ({ name: row.name as string }));

  // Fetch submission counts per cycle
  const { data: submissionCounts } = await access.supabase
    .from("employee_self_reviews")
    .select("review_cycle_id, status")
    .eq("org_id", access.orgId);

  const countByCycle = new Map<string, { total: number; submitted: number }>();
  for (const row of submissionCounts ?? []) {
    const cid = row.review_cycle_id as string;
    const existing = countByCycle.get(cid) ?? { total: 0, submitted: 0 };
    existing.total += 1;
    if (row.status === "submitted") existing.submitted += 1;
    countByCycle.set(cid, existing);
  }

  const typedCycles = (cycles ?? []) as ReviewCycleRow[];

  return (
    <>
      <DashboardHeader
        title="Review Cycles"
        description="Manage employee self-reviews and manager feedback across your organisation."
        actions={isAdminLike ? <CreateCycleDialog teams={teamOptions} /> : undefined}
      />

      <main className="flex-1 overflow-x-auto p-6">
        {typedCycles.length === 0 ? (
          <EmptyState isAdminLike={isAdminLike} teams={teamOptions} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {typedCycles.map((cycle) => {
              const counts = countByCycle.get(cycle.id);
              const cfg = statusConfig(cycle.status);
              const StatusIcon = cfg.icon;
              const pct =
                counts && counts.total > 0
                  ? Math.round((counts.submitted / counts.total) * 100)
                  : null;

              return (
                <Link
                  key={cycle.id}
                  href={`/reviews/${cycle.id}`}
                  className="group relative flex flex-col gap-4 rounded-2xl border border-border/65 bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  {/* Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 text-xs font-medium ${cfg.className}`}
                    >
                      <StatusIcon className="size-3" />
                      {cfg.label}
                    </Badge>
                    <ChevronRightIcon className="text-muted-foreground/40 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>

                  {/* Title + cadence */}
                  <div>
                    <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                      {cycle.title}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {cadenceLabel(cycle.cadence)} ·{" "}
                      {formatDate(cycle.period_start)} – {formatDate(cycle.period_end)}
                    </p>
                  </div>

                  {/* Submission progress */}
                  {counts ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Submissions</span>
                        <span className="font-semibold">
                          {counts.submitted}/{counts.total}
                          {pct !== null && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({pct}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${pct ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Open cycle to invite employees
                    </p>
                  )}

                  {/* Deadline */}
                  {cycle.self_review_due && (
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <ClockIcon className="size-3" />
                      Due {formatDate(cycle.self_review_due)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function EmptyState({
  isAdminLike,
  teams,
}: {
  isAdminLike: boolean;
  teams: { name: string }[];
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="bg-primary/8 text-primary mb-5 flex size-16 items-center justify-center rounded-2xl">
        <CalendarRangeIcon className="size-8" />
      </div>
      <h3 className="text-lg font-semibold">No review cycles yet</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        {isAdminLike
          ? "Create your first review cycle to start collecting employee self-reviews and manager feedback."
          : "Your admin hasn't created any review cycles yet. Check back soon."}
      </p>
      {isAdminLike && (
        <div className="mt-6">
          <CreateCycleDialog teams={teams} />
        </div>
      )}
      <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-left">
        {[
          {
            icon: SendIcon,
            title: "Employee fills form",
            desc: "Each employee gets a self-review link and shares their highlights, challenges, and goals.",
          },
          {
            icon: FilePenLineIcon,
            title: "Manager adds remarks",
            desc: "TL or manager reviews each response and adds structured feedback per section.",
          },
          {
            icon: LockIcon,
            title: "Admin approves",
            desc: "HR or Admin approves the final review — employees receive a summary PDF.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <item.icon className="text-primary mb-2 size-5" />
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
