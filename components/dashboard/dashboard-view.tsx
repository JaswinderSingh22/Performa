"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRightIcon,
  BarChart3Icon,
  ClipboardListIcon,
  MessageSquareIcon,
  SparklesIcon,
  TrophyIcon,
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
import {
  easingOut,
  staggerFieldItem,
  staggerFieldParent,
} from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/database";

export type LeaderboardSlice = {
  employeeId: string;
  employeeName: string;
  avgRating: number;
  reviewCount: number;
};

export type RecentReviewRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string | null;
  status: ReviewStatus;
  rating: number | null;
  createdAt: string;
};

export type TeamSlice = { name: string; count: number };

export type DashboardViewProps = {
  employeeCount: number;
  reviewCount: number;
  achievementCount: number;
  noteCount: number;
  reviewByStatus: { draft: number; published: number; archived: number };
  avgRating: number | null;
  ratedReviewCount: number;
  teams: TeamSlice[];
  recentReviews: RecentReviewRow[];
  teamsError?: boolean;
  topRated: LeaderboardSlice[];
  needsAttention: LeaderboardSlice[];
};

function statusLabel(status: ReviewStatus): string {
  switch (status) {
    case "published":
      return "Finalized";
    case "archived":
      return "Shelved";
    default:
      return "Draft";
  }
}

function statusBadgeVariant(
  status: ReviewStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "archived":
      return "secondary";
    default:
      return "outline";
  }
}

function formatPercent(part: number, total: number): string {
  if (total <= 0) return "0";
  return Math.round((part / total) * 100).toString();
}

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

export function DashboardView({
  employeeCount,
  reviewCount,
  achievementCount,
  noteCount,
  reviewByStatus,
  avgRating,
  ratedReviewCount,
  teams,
  recentReviews,
  teamsError = false,
  topRated = [],
  needsAttention = [],
}: DashboardViewProps): ReactElement {
  const prefersReducedMotion = useReducedMotion() === true;

  const finalizedRate =
    reviewCount > 0
      ? Math.round((reviewByStatus.published / reviewCount) * 100)
      : 0;

  const notePerEmployee =
    employeeCount > 0 ? (noteCount / employeeCount).toFixed(1) : "—";

  const statCards = [
    {
      title: "Employees",
      value: employeeCount,
      hint: "Active directory",
      icon: UsersIcon,
      accent: "from-sky-500/15 to-violet-500/10",
      iconClass: "text-sky-600 dark:text-sky-400",
      href: "/employees",
      cta: "Open directory",
    },
    {
      title: "Reviews",
      value: reviewCount,
      hint: `${reviewByStatus.published} finalized · ${reviewByStatus.draft} in progress`,
      icon: ClipboardListIcon,
      accent: "from-violet-500/15 to-fuchsia-500/10",
      iconClass: "text-violet-600 dark:text-violet-400",
      href: "/reviews",
      cta: "Review hub",
    },
    {
      title: "Achievements",
      value: achievementCount,
      hint: "Logged wins",
      icon: TrophyIcon,
      accent: "from-amber-500/15 to-orange-500/10",
      iconClass: "text-amber-600 dark:text-amber-400",
      href: "/achievements",
      cta: "Browse wins",
    },
    {
      title: "Notes",
      value: noteCount,
      hint: employeeCount ? `~${notePerEmployee} / person` : "Manager notes",
      icon: MessageSquareIcon,
      accent: "from-emerald-500/15 to-teal-500/10",
      iconClass: "text-emerald-600 dark:text-emerald-400",
      href: "/notes",
      cta: "Open feed",
    },
  ] as const;

  const reviewTotalForBar =
    reviewByStatus.draft +
    reviewByStatus.published +
    reviewByStatus.archived;

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
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easingOut }}
          className="border-border/60 from-card/90 to-muted/25 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_18px_48px_-24px_rgba(15,23,42,0.25)] backdrop-blur-sm md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="bg-primary/12 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <BarChart3Icon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Workspace pulse
                </p>
                <h2 className="font-heading mt-1 text-lg font-semibold tracking-tight md:text-xl">
                  Performance coverage at a glance
                </h2>
                <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">
                  <span className="text-foreground font-medium">
                    Notes and achievements
                  </span>{" "}
                  save as you type.{" "}
                  <span className="text-foreground font-medium">
                    Performance reviews
                  </span>{" "}
                  stay in draft until you{" "}
                  <strong className="text-foreground font-medium">finalize</strong>{" "}
                  them (then they lock in the checklist-based score for reports).
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1 font-normal tabular-nums">
                <SparklesIcon className="size-3.5 opacity-70" aria-hidden />
                Avg from finalized reviews
                {avgRating !== null ? (
                  <>
                    {": "}
                    <span className="text-foreground font-semibold">
                      {avgRating.toFixed(1)}
                    </span>
                    /5
                  </>
                ) : (
                  <span className="text-muted-foreground"> — none yet</span>
                )}
              </Badge>
              {ratedReviewCount > 0 ? (
                <span className="text-muted-foreground self-center text-xs tabular-nums">
                  ({ratedReviewCount} finalized reviews with scores)
                </span>
              ) : null}
            </div>
          </div>
        </motion.div>

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
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit gap-0.5 rounded-lg shadow-sm"
                      render={<Link href={card.href} />}
                      nativeButton={false}
                    >
                      {card.cta}
                      <ArrowUpRightIcon className="size-3.5 opacity-70" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {(topRated.length > 0 || needsAttention.length > 0) && (
          <motion.div
            className="grid gap-4 md:grid-cols-2"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.48,
              ease: easingOut,
              delay: prefersReducedMotion ? 0 : 0.08,
            }}
          >
            <Card className="border-emerald-500/12 from-emerald-500/[0.04] shadow-md lg:shadow-md bg-gradient-to-br to-transparent">
              <CardHeader className="border-emerald-500/10 border-b">
                <CardTitle>Strengths · high scores</CardTitle>
                <CardDescription>
                  Best average ratings from{" "}
                  <strong className="text-foreground font-medium">finalized</strong>{" "}
                  performance reviews—open the profile for next steps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {topRated.length === 0 ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Once someone has a finalized scored review, they&apos;ll rank here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topRated.map((row) => (
                      <li key={row.employeeId}>
                        <Link
                          href={`/employees/${row.employeeId}?tab=reviews`}
                          className="hover:bg-muted/45 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors"
                        >
                          <span className="text-foreground font-medium truncate">
                            {row.employeeName}
                          </span>
                          <span className="text-muted-foreground tabular-nums text-sm">
                            {row.avgRating.toFixed(1)}/5
                            <span className="opacity-70">
                              · {row.reviewCount}{" "}
                              {row.reviewCount === 1 ? "review" : "reviews"}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card className="border-amber-500/18 from-amber-500/[0.05] shadow-md lg:shadow-md bg-gradient-to-br to-transparent">
              <CardHeader className="border-amber-500/14 border-b">
                <CardTitle>Focus · low averages</CardTitle>
                <CardDescription>
                  People with the lowest finalized-review averages—pair with coaching,
                  training, or another formal review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {needsAttention.length === 0 ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Needs more finalized review data before we can spotlight gaps.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {needsAttention.map((row) => (
                      <li key={`low-${row.employeeId}`}>
                        <Link
                          href={`/employees/${row.employeeId}?tab=reviews`}
                          className="hover:bg-muted/45 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors"
                        >
                          <span className="text-foreground font-medium truncate">
                            {row.employeeName}
                          </span>
                          <span className="text-muted-foreground tabular-nums text-sm">
                            {row.avgRating.toFixed(1)}/5
                            <span className="opacity-70">
                              · {row.reviewCount}{" "}
                              {row.reviewCount === 1 ? "review" : "reviews"}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          <motion.div
            className="lg:col-span-3"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.48,
              ease: easingOut,
              delay: prefersReducedMotion ? 0 : 0.12,
            }}
          >
            <Card className="border-border/70 h-full shadow-md">
              <CardHeader className="border-border/60 border-b">
                <CardTitle>Performance reviews (only)</CardTitle>
                <CardDescription>
                  Draft vs finalized lifecycle applies here—not to notes or achievements.
                  Finalizing makes the documented score eligible for dashboards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="bg-muted-foreground/70 size-2 rounded-full" />
                    <span className="text-muted-foreground">
                      Draft
                      <strong className="text-foreground ml-1 tabular-nums font-semibold">
                        {reviewByStatus.draft}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-primary size-2 rounded-full" />
                    <span className="text-muted-foreground">
                      Finalized
                      <strong className="text-foreground ml-1 tabular-nums font-semibold">
                        {reviewByStatus.published}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-violet-500 size-2 rounded-full" />
                    <span className="text-muted-foreground">
                      Shelved
                      <strong className="text-foreground ml-1 tabular-nums font-semibold">
                        {reviewByStatus.archived}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-muted-foreground mb-2 flex justify-between text-xs">
                      <span>Draft share</span>
                      <span className="tabular-nums font-medium">
                        {formatPercent(reviewByStatus.draft, reviewTotalForBar)}%
                      </span>
                    </div>
                    <AnimatedBar
                      value={reviewByStatus.draft}
                      total={reviewTotalForBar || 1}
                      className="bg-muted-foreground/45"
                      delay={0}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-2 flex justify-between text-xs">
                      <span>Finalized share</span>
                      <span className="tabular-nums font-medium text-primary">
                        {formatPercent(
                          reviewByStatus.published,
                          reviewTotalForBar,
                        )}
                        %
                      </span>
                    </div>
                    <AnimatedBar
                      value={reviewByStatus.published}
                      total={reviewTotalForBar || 1}
                      className="bg-primary"
                      delay={0.08}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-2 flex justify-between text-xs">
                      <span>Shelved share</span>
                      <span className="tabular-nums font-medium">
                        {formatPercent(
                          reviewByStatus.archived,
                          reviewTotalForBar,
                        )}
                        %
                      </span>
                    </div>
                    <AnimatedBar
                      value={reviewByStatus.archived}
                      total={reviewTotalForBar || 1}
                      className="bg-violet-500"
                      delay={0.16}
                    />
                  </div>
                </div>

                <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Completion spotlight · reviews only
                  </span>
                  <span className="font-heading font-semibold tabular-nums">
                    <span className="text-primary text-2xl">
                      {finalizedRate}
                    </span>
                    <span className="text-muted-foreground text-base font-normal">
                      % finalized
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            className="lg:col-span-2"
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
                <CardTitle>Recent performance reviews</CardTitle>
                <CardDescription>
                  Opens the review hub on the exact row. Notes and achievements stay
                  separate—only reviews have a finalize step.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg shadow-sm"
                render={<Link href="/reviews" />}
                nativeButton={false}
              >
                Review hub
              </Button>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              {recentReviews.length === 0 ? (
                <p className="text-muted-foreground px-4 py-12 text-center text-sm md:px-6">
                  No reviews yet. Start a structured review from any employee&apos;s
                  profile.
                </p>
              ) : (
                <ul className="divide-border/75 divide-y">
                  {recentReviews.map((row, idx) => (
                    <motion.li
                      key={row.id}
                      initial={
                        prefersReducedMotion ? false : { opacity: 0, x: -8 }
                      }
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.32,
                        ease: easingOut,
                        delay: prefersReducedMotion ? 0 : 0.04 + idx * 0.045,
                      }}
                    >
                      <Link
                        href={`/reviews?highlight=${row.id}`}
                        className="hover:bg-muted/45 flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors md:px-6"
                      >
                        <div className="min-w-0">
                          <p className="text-foreground truncate font-medium">
                            {row.title?.trim() || "Performance review"}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {row.employeeName}
                            <span className="mx-1.5 opacity-40">·</span>
                            {new Date(row.createdAt).toLocaleDateString(
                              undefined,
                              { dateStyle: "medium" },
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={statusBadgeVariant(row.status)}
                            className="font-normal"
                          >
                            {statusLabel(row.status)}
                          </Badge>
                          {typeof row.rating === "number" ? (
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {row.rating}/5
                            </span>
                          ) : null}
                          <ArrowUpRightIcon className="text-muted-foreground size-4 shrink-0 opacity-50" />
                        </div>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
