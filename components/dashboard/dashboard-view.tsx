"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRightIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  easingOut,
  staggerFieldItem,
  staggerFieldParent,
} from "@/lib/motion-variants";
import { cn } from "@/lib/utils";

export type TeamSlice = { name: string; count: number };

export type RecentCycleRow = {
  id: string;
  title: string;
  status: string;
  totalEmployees: number;
  submitted: number;
  createdAt: string;
};

export type DashboardViewProps = {
  employeeCount: number;
  teamCount: number;
  departmentCount: number;
  activeCycleCount: number;
  teams: TeamSlice[];
  recentCycles: RecentCycleRow[];
  teamsError?: boolean;
  submittedCount: number;
  pendingCount: number;
};

function AnimatedBar({
  value,
  total,
  className,
  delay = 0,
}: {
  value: number;
  total: number;
  className?: string;
  delay?: number;
}): ReactElement {
  const reduce = useReducedMotion() === true;
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="bg-muted/80 h-2.5 w-full overflow-hidden rounded-full">
      <motion.div
        className={cn("h-full rounded-full", className)}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{
          duration: reduce ? 0 : 0.85,
          ease: easingOut,
          delay: reduce ? 0 : delay,
        }}
      />
    </div>
  );
}

function cycleStatusBadge(status: string): ReactElement {
  if (status === "open")
    return <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-normal">Open</Badge>;
  if (status === "closed")
    return <Badge variant="secondary" className="font-normal">Closed</Badge>;
  return <Badge variant="outline" className="font-normal text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">Draft</Badge>;
}

export function DashboardView({
  employeeCount,
  teamCount,
  departmentCount,
  activeCycleCount,
  teams,
  recentCycles,
  teamsError = false,
  submittedCount,
  pendingCount,
}: DashboardViewProps): ReactElement {
  const prefersReducedMotion = useReducedMotion() === true;
  const totalReviewable = submittedCount + pendingCount;
  const submittedRate = totalReviewable > 0 ? Math.round((submittedCount / totalReviewable) * 100) : 0;

  const statCards = [
    {
      title: "Employees",
      value: String(employeeCount),
      hint: "Active directory",
      icon: UsersIcon,
      accent: "from-sky-500/15 to-violet-500/10",
      iconClass: "text-sky-600 dark:text-sky-400",
    },
    {
      title: "Teams",
      value: String(teamCount),
      hint: "Configured in organisation",
      icon: ClipboardListIcon,
      accent: "from-violet-500/15 to-fuchsia-500/10",
      iconClass: "text-violet-600 dark:text-violet-400",
    },
    {
      title: "Departments",
      value: String(departmentCount),
      hint: "Active business units",
      icon: TrophyIcon,
      accent: "from-amber-500/15 to-orange-500/10",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Review Cycles",
      value: String(activeCycleCount),
      hint: activeCycleCount === 0 ? "No active cycles" : `${activeCycleCount} active`,
      icon: CalendarRangeIcon,
      accent: "from-emerald-500/15 to-teal-500/10",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
  ] as const;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="bg-primary/6 absolute -top-24 left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-[100%] blur-3xl" />
        <div className="bg-violet-500/5 absolute top-40 -right-32 h-72 w-72 rounded-full blur-3xl" />
        <div className="bg-sky-500/5 absolute -bottom-20 -left-20 h-64 w-64 rounded-full blur-3xl" />
      </div>

      <main className="flex flex-1 flex-col gap-8 p-6 pb-10">
        <motion.div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={staggerFieldParent}
        >
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.title} variants={staggerFieldItem}>
                <Card
                  size="sm"
                  className={cn(
                    "border-border/70 shadow-primary/10 hover:border-primary/15 from-card transition-[box-shadow,border-color] hover:shadow-lg",
                    "bg-gradient-to-br to-transparent",
                    card.accent,
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold">
                          {card.title}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {card.hint}
                        </CardDescription>
                      </div>
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/55 dark:bg-white/8",
                          card.iconClass,
                        )}
                      >
                        <Icon className="size-[1.125rem]" aria-hidden />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 pt-0">
                    <p className="text-foreground text-4xl font-semibold tracking-tight tabular-nums">
                      {card.value}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {totalReviewable > 0 && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: easingOut, delay: prefersReducedMotion ? 0 : 0.06 }}
          >
            <Card className="border-border/70 shadow-md">
              <CardHeader className="border-border/60 border-b">
                <CardTitle>Self-review submission progress</CardTitle>
                <CardDescription>
                  Across all open cycles — {submittedCount} of {totalReviewable} employees have submitted.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-semibold tabular-nums">{submittedCount} / {totalReviewable} <span className="text-muted-foreground font-normal">({submittedRate}%)</span></span>
                  </div>
                  <AnimatedBar
                    value={submittedCount}
                    total={totalReviewable || 1}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          <motion.div
            className="lg:col-span-5"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.48,
              ease: easingOut,
              delay: prefersReducedMotion ? 0 : 0.2,
            }}
          >
            <Card className="border-border/70 flex h-full flex-col shadow-md">
              <CardHeader className="border-border/60 border-b">
                <CardTitle>Team footprint</CardTitle>
                <CardDescription>
                  Headcount by squad (unassigned grouped).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 pt-4">
                {teamsError ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Team breakdown couldn&apos;t be loaded. Refresh to try again.
                  </p>
                ) : teams.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {employeeCount === 0
                      ? "Add employees to populate team analytics."
                      : "Set a team name when adding people to see squad mix here."}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {teams.map((t, index) => {
                      const pct =
                        employeeCount > 0
                          ? Math.round((t.count / employeeCount) * 100)
                          : 0;
                      return (
                        <li key={t.name}>
                          <div className="text-muted-foreground mb-1.5 flex justify-between text-xs">
                            <span className="text-foreground max-w-[70%] truncate font-medium">
                              {t.name}
                            </span>
                            <span className="tabular-nums">
                              {t.count}{" "}
                              <span className="opacity-75">({pct}%)</span>
                            </span>
                          </div>
                          <AnimatedBar
                            value={t.count}
                            total={employeeCount || 1}
                            className="bg-gradient-to-r from-sky-500 to-violet-500"
                            delay={0.05 * index}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.48,
            ease: easingOut,
            delay: prefersReducedMotion ? 0 : 0.28,
          }}
        >
          <Card className="border-border/70 shadow-md">
            <CardHeader className="border-border/60 flex flex-row flex-wrap items-start justify-between gap-3 border-b">
              <div>
                <CardTitle>Recent review cycles</CardTitle>
                <CardDescription>
                  Latest cycles — click to view submission details.
                </CardDescription>
              </div>
              <Link
                href="/reviews"
                className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium transition-colors"
              >
                View all <ArrowUpRightIcon className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              {recentCycles.length === 0 ? (
                <p className="text-muted-foreground px-4 py-12 text-center text-sm md:px-6">
                  No review cycles yet.{" "}
                  <Link href="/reviews" className="text-primary hover:underline">
                    Create your first cycle
                  </Link>{" "}
                  to get started.
                </p>
              ) : (
                <ul className="divide-border/75 divide-y">
                  {recentCycles.map((row, idx) => {
                    const pct = row.totalEmployees > 0
                      ? Math.round((row.submitted / row.totalEmployees) * 100)
                      : 0;
                    return (
                      <motion.li
                        key={row.id}
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.32,
                          ease: easingOut,
                          delay: prefersReducedMotion ? 0 : 0.04 + idx * 0.045,
                        }}
                      >
                        <Link
                          href={`/reviews/${row.id}`}
                          className="hover:bg-muted/45 flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors md:px-6"
                        >
                          <div className="min-w-0">
                            <p className="text-foreground truncate font-medium">
                              {row.title}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {row.totalEmployees > 0
                                ? `${row.submitted}/${row.totalEmployees} submitted (${pct}%)`
                                : "No employees assigned yet"}
                              <span className="mx-1.5 opacity-40">·</span>
                              {new Date(row.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {cycleStatusBadge(row.status)}
                            <ArrowUpRightIcon className="text-muted-foreground size-4 shrink-0 opacity-50" />
                          </div>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
