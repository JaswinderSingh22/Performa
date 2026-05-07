"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  LayersIcon,
  MailIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UserMinusIcon,
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
export type DepartmentSlice = { name: string; count: number };

export type RecentCycleRow = {
  id: string;
  title: string;
  status: string;
  totalEmployees: number;
  submitted: number;
  createdAt: string;
};

export type OpenCycleProgress = {
  id: string;
  title: string;
  due: string | null;
  total: number;
  submitted: number;
  pending: number;
};

export type OrgReviewTotals = {
  submitted: number;
  pending: number;
  total: number;
};

export type ReviewPipeline = {
  /** Submitted self-review but no remark or remark still in draft */
  needManagerInput: number;
  /** Remark submitted, awaiting approval */
  awaitingApproval: number;
  /** Remark approved */
  approved: number;
};

export type PeopleHealth = {
  activeEmployees: number;
  inactiveEmployees: number;
  unassignedTeam: number;
  unassignedDepartment: number;
  pendingWorkspaceInvites: number;
  draftCycles: number;
};

export type DashboardViewProps = {
  employeeCount: number;
  teamCount: number;
  departmentCount: number;
  activeCycleCount: number;
  teams: TeamSlice[];
  departments: DepartmentSlice[];
  recentCycles: RecentCycleRow[];
  teamsError?: boolean;
  departmentsError?: boolean;
  openCycleProgress: OpenCycleProgress[];
  orgReviewTotals: OrgReviewTotals;
  reviewPipeline: ReviewPipeline;
  peopleHealth: PeopleHealth;
  showAdminInsights: boolean;
  /** Org-wide vs team-lead scoped analytics */
  dashboardMode?: "org" | "team";
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
  departments,
  recentCycles,
  teamsError = false,
  departmentsError = false,
  openCycleProgress,
  orgReviewTotals,
  reviewPipeline,
  peopleHealth,
  showAdminInsights,
  dashboardMode = "org",
}: DashboardViewProps): ReactElement {
  const prefersReducedMotion = useReducedMotion() === true;
  const teamDash = dashboardMode === "team";

  const submittedRate =
    orgReviewTotals.total > 0
      ? Math.round((orgReviewTotals.submitted / orgReviewTotals.total) * 100)
      : 0;

  const statCards = [
    {
      title: teamDash ? "Team members" : "Employees",
      value: String(employeeCount),
      hint: teamDash
        ? "Everyone on teams you lead except you and workspace Admin/HR"
        : "All people in directory",
      icon: UsersIcon,
      accent: "from-sky-500/15 to-violet-500/10",
      iconClass: "text-sky-600 dark:text-sky-400",
    },
    {
      title: "Teams",
      value: String(teamCount),
      hint: teamDash ? "Teams you manage" : "Configured squads",
      icon: LayersIcon,
      accent: "from-violet-500/15 to-fuchsia-500/10",
      iconClass: "text-violet-600 dark:text-violet-400",
    },
    {
      title: "Departments",
      value: String(departmentCount),
      hint: teamDash ? "Across your roster" : "Business units",
      icon: TrophyIcon,
      accent: "from-amber-500/15 to-orange-500/10",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Review Cycles",
      value: String(activeCycleCount),
      hint: activeCycleCount === 0 ? "No active cycles" : `${activeCycleCount} open / in review`,
      icon: CalendarRangeIcon,
      accent: "from-emerald-500/15 to-teal-500/10",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
  ] as const;

  const pipelineTotal =
    reviewPipeline.needManagerInput +
    reviewPipeline.awaitingApproval +
    reviewPipeline.approved;

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
                    "border-border/70 shadow-primary/10 hover:border-primary/15 from-card ring-1 ring-black/[0.04] transition-[box-shadow,border-color] hover:shadow-lg",
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

        {/* Row: aggregate self-review progress + manager pipeline */}
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: easingOut, delay: prefersReducedMotion ? 0 : 0.04 }}
          >
            <Card className="border-border/70 h-full shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="border-border/60 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Self-review submission progress</CardTitle>
                    <CardDescription>
                      {teamDash
                        ? "Open cycles — scoped to your roster (you, Admin, and HR omitted)."
                        : "Across all open cycles — combined headcount and completion rate."}
                    </CardDescription>
                  </div>
                  <Link
                    href="/reviews"
                    className="text-primary hover:text-primary/80 flex shrink-0 items-center gap-1 text-sm font-medium transition-colors"
                  >
                    Cycles <ArrowUpRightIcon className="size-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {orgReviewTotals.total === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
                    <CalendarRangeIcon className="size-9 opacity-40" />
                    <p>No open review cycles with forms yet.</p>
                    <Link href="/reviews" className="text-primary text-sm font-medium hover:underline">
                      Open or create a cycle
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Submitted</span>
                      <span className="font-semibold tabular-nums">
                        {orgReviewTotals.submitted} / {orgReviewTotals.total}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({submittedRate}%)
                        </span>
                      </span>
                    </div>
                    <AnimatedBar
                      value={orgReviewTotals.submitted}
                      total={orgReviewTotals.total || 1}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500"
                    />
                    <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
                      <span>
                        <strong className="text-foreground tabular-nums">{orgReviewTotals.pending}</strong>{" "}
                        self-reviews still pending
                      </span>
                      {openCycleProgress.length > 1 ? (
                        <span>{openCycleProgress.length} open cycles in parallel</span>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: easingOut, delay: prefersReducedMotion ? 0 : 0.08 }}
          >
            <Card className="border-border/70 h-full shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="border-border/60 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Manager review pipeline</CardTitle>
                    <CardDescription>
                      {teamDash
                        ? "Status of remarks for your team’s submitted self-reviews."
                        : "Where each submitted self-review sits in HR / manager approval."}
                    </CardDescription>
                  </div>
                  <ClipboardListIcon className="text-muted-foreground/80 size-8 shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {pipelineTotal === 0 && orgReviewTotals.submitted === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    Nothing in the pipeline yet —{" "}
                    {teamDash ? "team members need to submit self-reviews first." : "employees need to submit self-reviews first."}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-sm">
                        <AlertCircleIcon className="text-amber-600 size-4 shrink-0" />
                        Needs manager input
                      </span>
                      <span className="text-lg font-semibold tabular-nums">{reviewPipeline.needManagerInput}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-sm">
                        <ShieldCheckIcon className="text-violet-600 size-4 shrink-0" />
                        Awaiting HR / final approval
                      </span>
                      <span className="text-lg font-semibold tabular-nums">{reviewPipeline.awaitingApproval}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-sm">
                        <SparklesIcon className="text-emerald-600 size-4 shrink-0" />
                        Approved
                      </span>
                      <span className="text-lg font-semibold tabular-nums">{reviewPipeline.approved}</span>
                    </li>
                  </ul>
                )}
                <Link
                  href="/reviews"
                  className="text-primary hover:text-primary/85 mt-4 inline-flex items-center gap-1 text-sm font-medium"
                >
                  Review all cycles <ArrowUpRightIcon className="size-3.5" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {openCycleProgress.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: easingOut, delay: prefersReducedMotion ? 0 : 0.1 }}
          >
            <Card className="border-border/70 shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="border-border/60 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Active review cycles</CardTitle>
                    <CardDescription>Self-review submission progress per open cycle.</CardDescription>
                  </div>
                  <Link href="/reviews" className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium transition-colors shrink-0">
                    Manage <ArrowUpRightIcon className="size-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {openCycleProgress.map((cycle, idx) => {
                  const pct =
                    cycle.total > 0 ? Math.round((cycle.submitted / cycle.total) * 100) : 0;
                  const daysLeft = cycle.due
                    ? Math.ceil((new Date(cycle.due).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <Link key={cycle.id} href={`/reviews/${cycle.id}`} className="group block">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                          {cycle.title}
                        </span>
                        <div className="flex shrink-0 items-center gap-3">
                          {daysLeft !== null && (
                            <span
                              className={`text-xs tabular-nums ${
                                daysLeft <= 3
                                  ? "font-semibold text-red-500"
                                  : daysLeft <= 7
                                    ? "text-amber-600"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                            </span>
                          )}
                          <span className="text-xs font-semibold tabular-nums">
                            {cycle.submitted}/{cycle.total}{" "}
                            <span className="text-muted-foreground font-normal">({pct}%)</span>
                          </span>
                        </div>
                      </div>
                      <AnimatedBar
                        value={cycle.submitted}
                        total={cycle.total || 1}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500"
                        delay={0.05 * idx}
                      />
                      <div className="text-muted-foreground mt-1.5 flex gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                          {cycle.submitted} submitted
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-block size-1.5 rounded-full bg-muted-foreground/40" />
                          {cycle.pending} pending
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* People + admin alerts + shortcuts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <motion.div
            className="lg:col-span-2"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: easingOut, delay: prefersReducedMotion ? 0 : 0.14 }}
          >
            <Card className="border-border/70 shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="border-border/60 border-b">
                <CardTitle>{teamDash ? "Team roster health" : "People & directory health"}</CardTitle>
                <CardDescription>
                  {teamDash
                    ? "Activity and assignments for people on your teams."
                    : "Quick signals for HR and admins — coverage and lifecycle."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                    Active vs inactive
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums">
                      {peopleHealth.activeEmployees}
                    </span>
                    <span className="text-muted-foreground text-sm">active</span>
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                    <UserMinusIcon className="size-3.5" />
                    {peopleHealth.inactiveEmployees} inactive (exits / off-boarding)
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                    Assignment gaps
                  </p>
                  <p className="text-foreground text-sm leading-relaxed">
                    <strong className="tabular-nums">{peopleHealth.unassignedTeam}</strong> without a team,{" "}
                    <strong className="tabular-nums">{peopleHealth.unassignedDepartment}</strong> without a department.
                  </p>
                  <Link
                    href="/employees"
                    className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium"
                  >
                    Open directory <ArrowUpRightIcon className="size-3" />
                  </Link>
                </div>
                {showAdminInsights && (
                  <div className="sm:col-span-2 flex flex-wrap gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                    {peopleHealth.draftCycles > 0 ? (
                      <div className="flex min-w-[140px] flex-1 items-start gap-2">
                        <CalendarRangeIcon className="text-sky-600 mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{peopleHealth.draftCycles} draft cycle(s)</p>
                          <p className="text-muted-foreground text-xs">Ready to open when you&apos;re set.</p>
                        </div>
                      </div>
                    ) : null}
                    {peopleHealth.pendingWorkspaceInvites > 0 ? (
                      <div className="flex min-w-[140px] flex-1 items-start gap-2">
                        <MailIcon className="text-sky-600 mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">
                            {peopleHealth.pendingWorkspaceInvites} pending invite(s)
                          </p>
                          <p className="text-muted-foreground text-xs">Managers / TLs not joined yet.</p>
                        </div>
                      </div>
                    ) : null}
                    {peopleHealth.draftCycles === 0 && peopleHealth.pendingWorkspaceInvites === 0 ? (
                      <p className="text-muted-foreground text-sm">No admin alerts right now.</p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: easingOut, delay: prefersReducedMotion ? 0 : 0.18 }}
          >
            <Card className="border-border/70 flex h-full flex-col shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="border-border/60 border-b">
                <CardTitle>Where to work next</CardTitle>
                <CardDescription>
                  Structured reviews — not separate notes or achievement lists.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2 pt-4">
                <Link
                  href="/reviews"
                  className="hover:bg-muted/50 flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardListIcon className="text-primary size-4" />
                    Review cycles
                  </span>
                  <ArrowUpRightIcon className="text-muted-foreground size-4" />
                </Link>
                <Link
                  href="/employees"
                  className="hover:bg-muted/50 flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <UsersIcon className="text-sky-600 size-4" />
                    {teamDash ? "Team roster" : "Employees"}
                  </span>
                  <ArrowUpRightIcon className="text-muted-foreground size-4" />
                </Link>
                {!teamDash ? (
                  <Link
                    href="/teams"
                    className="hover:bg-muted/50 flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LayersIcon className="text-violet-600 size-4" />
                      Organisation
                    </span>
                    <ArrowUpRightIcon className="text-muted-foreground size-4" />
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.48,
              ease: easingOut,
              delay: prefersReducedMotion ? 0 : 0.2,
            }}
          >
            <Card className="border-border/70 flex h-full flex-col shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="border-border/60 border-b">
                <CardTitle>Team footprint</CardTitle>
                <CardDescription>
                  {teamDash ? "Your teams — share of roster." : "Headcount by squad (unassigned grouped)."}
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
                        employeeCount > 0 ? Math.round((t.count / employeeCount) * 100) : 0;
                      return (
                        <li key={t.name}>
                          <div className="text-muted-foreground mb-1.5 flex justify-between text-xs">
                            <span className="text-foreground max-w-[70%] truncate font-medium">
                              {t.name}
                            </span>
                            <span className="tabular-nums">
                              {t.count} <span className="opacity-75">({pct}%)</span>
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

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.48,
              ease: easingOut,
              delay: prefersReducedMotion ? 0 : 0.22,
            }}
          >
            <Card className="border-border/70 flex h-full flex-col shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="border-border/60 border-b">
                <CardTitle>Department footprint</CardTitle>
                <CardDescription>
                  {teamDash ? "Department mix across your roster." : "Headcount by department (unassigned grouped)."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 pt-4">
                {departmentsError ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Department breakdown couldn&apos;t be loaded. Refresh to try again.
                  </p>
                ) : departments.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {employeeCount === 0
                      ? "Add employees to see department mix."
                      : "Set a department on employee records to see distribution here."}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {departments.map((d, index) => {
                      const pct =
                        employeeCount > 0 ? Math.round((d.count / employeeCount) * 100) : 0;
                      return (
                        <li key={d.name}>
                          <div className="text-muted-foreground mb-1.5 flex justify-between text-xs">
                            <span className="text-foreground max-w-[70%] truncate font-medium">
                              {d.name}
                            </span>
                            <span className="tabular-nums">
                              {d.count} <span className="opacity-75">({pct}%)</span>
                            </span>
                          </div>
                          <AnimatedBar
                            value={d.count}
                            total={employeeCount || 1}
                            className="bg-gradient-to-r from-amber-500 to-orange-500"
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
          <Card className="border-border/70 shadow-md ring-1 ring-black/[0.04]">
            <CardHeader className="border-border/60 flex flex-row flex-wrap items-start justify-between gap-3 border-b">
              <div>
                <CardTitle>Recent review cycles</CardTitle>
                <CardDescription>
                  {teamDash
                    ? "Latest cycles — submission counts scoped to your team roster."
                    : "Latest cycles — click to view submission details."}
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
                    const pct =
                      row.totalEmployees > 0
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
                            <p className="text-foreground truncate font-medium">{row.title}</p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {row.totalEmployees > 0
                                ? `${row.submitted}/${row.totalEmployees} submitted (${pct}%)`
                                : "No employees assigned yet"}
                              <span className="mx-1.5 opacity-40">·</span>
                              {new Date(row.createdAt).toLocaleDateString(undefined, {
                                dateStyle: "medium",
                              })}
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
