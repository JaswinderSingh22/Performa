'use client';
import Link from "next/link";
import type { ReactElement } from "react";
import * as React from "react";
import {
  CalendarRangeIcon,
  ClipboardListIcon,
  InfoIcon,
  StickyNoteIcon,
  TrophyIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatIsoDate, formatIsoDateRange } from "@/lib/format-dates";
import { InsightsOverallRating } from "@/components/employees/insights-overall-rating";
import { InsightsPerformanceChart } from "@/components/employees/insights-performance-chart";
import { AchievementsPanel } from "@/components/employees/achievements-panel";
import { EmployeeNotesPanel } from "@/components/employees/employee-notes-panel";
import { ReviewsPanel, RollupsPanel } from "@/components/employees/reviews-panel";
import {
  generatedReviewPerformanceSeries,
  missingCadenceReminders,
  rollUpOverallScoreSummary,
  REVIEW_CADENCE_LABELS,
  type ReviewCadence,
} from "@/lib/review-cadence";
import type {
  AchievementRow,
  EmployeeNoteRow,
  EmployeeRow,
  ReviewWithDimensions,
} from "@/types/database";

function cadenceOrDefault(c: string | null | undefined): ReviewCadence {
  if (
    c === "monthly" ||
    c === "quarterly" ||
    c === "mid_year" ||
    c === "yearly"
  ) {
    return c;
  }
  return "quarterly";
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function reviewTitle(row: ReviewWithDimensions): string {
  const t = row.title?.trim();
  return t && t.length > 0 ? t : "Performance review";
}

function strategyLabel(strategy: string | null | undefined): string | null {
  if (!strategy) return null;
  if (strategy === "raw_period") return "Period roll-up";
  if (strategy === "stitched_summaries") return "Stitched roll-up";
  return strategy;
}

function teaser(text: string | null | undefined, max = 180): string {
  const t = text?.trim() ?? "";
  if (t.length <= max) return t || "—";
  return `${t.slice(0, max).trim()}…`;
}

function formatIsoLocalMedium(iso: string): string {
  // Deterministic string to avoid hydration mismatches across locales/timezones.
  return formatIsoDate(iso);
}

function isWithinRange(dateIso: string, fromIso: string, toIso: string): boolean {
  return dateIso >= fromIso && dateIso <= toIso;
}

type OverallWindow = "all" | "month" | "quarter" | "mid_year" | "year";

function cutoffIsoForWindow(window: Exclude<OverallWindow, "all">): string {
  const d = new Date();
  if (window === "month") d.setMonth(d.getMonth() - 1);
  if (window === "quarter") d.setMonth(d.getMonth() - 3);
  if (window === "mid_year") d.setMonth(d.getMonth() - 6);
  if (window === "year") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function EmployeeInsightsView({
  employee,
  reportingTo,
  achievements,
  notes,
  reviews,
  orgReviewCadence,
  orgQuarterStartMonth,
  initialTab,
  readOnly = false,
}: {
  employee: EmployeeRow;
  reportingTo?: { employee_code: string; name: string } | null;
  achievements: AchievementRow[];
  notes: EmployeeNoteRow[];
  reviews: ReviewWithDimensions[];
  orgReviewCadence: ReviewCadence;
  orgQuarterStartMonth: number;
  initialTab?: string;
  readOnly?: boolean;
}): ReactElement {
  const tab =
    initialTab === "achievements" ||
    initialTab === "notes" ||
    initialTab === "reviews" ||
    initialTab === "rollups"
      ? initialTab
      : "achievements";
  const [overallWindow, setOverallWindow] = React.useState<OverallWindow>("all");
  const standaloneReviews = reviews.filter(
    (r) =>
      r.generation_strategy !== "raw_period" &&
      r.generation_strategy !== "stitched_summaries",
  );
  const reviewSaved = standaloneReviews.length;
  const withPeriod = reviews.filter((r) => r.period_start && r.period_end);
  const dimAvg =
    reviews.length > 0
      ? reviews
          .map((r) => {
            const dims = r.review_dimensions ?? [];
            if (dims.length === 0) return null;
            const mean =
              dims.reduce((a, d) => a + d.rating, 0) / dims.length;
            return Math.round(mean * 10) / 10;
          })
          .filter((n): n is number => n !== null)
      : [];
  const trend =
    dimAvg.length > 0
      ? Math.round(
          (dimAvg.reduce((a, b) => a + b, 0) / dimAvg.length) * 10,
        ) / 10
      : null;

  const recentAchievements = achievements.slice(0, 5);
  const recentNotes = notes.slice(0, 5);
  const sortedReviews = [...reviews].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const recentReviews = sortedReviews.slice(0, 6);

  const rollupSeries = generatedReviewPerformanceSeries(reviews);
  const scoredSeries = rollupSeries.filter(
    (p): p is (typeof rollupSeries)[number] & { score10: number } => p.score10 !== null,
  );
  const filteredScoredSeries = React.useMemo(() => {
    if (overallWindow === "all") return scoredSeries;
    const cutoff = cutoffIsoForWindow(overallWindow);
    return scoredSeries.filter((p) => p.periodStart >= cutoff);
  }, [overallWindow, scoredSeries]);
  const overall10 =
    filteredScoredSeries.length === 0
      ? null
      : Math.round(
          (filteredScoredSeries.reduce((acc, p) => acc + p.score10, 0) /
            filteredScoredSeries.length) *
            10,
        ) / 10;
  const windowLabels: Record<OverallWindow, string> = {
    all: "Overall average",
    month: "Last month",
    quarter: "Last quarter",
    mid_year: "Last mid-year",
    year: "Last year",
  };
  const overallSummary = rollUpOverallScoreSummary(reviews);
  let overallSubtitle = windowLabels[overallWindow];
  let overallDateSubtitle: string | null = null;
  if (filteredScoredSeries.length > 0) {
    const sorted = [...filteredScoredSeries].sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    overallSubtitle =
      filteredScoredSeries.length === 1
        ? `${windowLabels[overallWindow]} · 1 period`
        : `${windowLabels[overallWindow]} · ${filteredScoredSeries.length} periods`;
    overallDateSubtitle =
      first.sortKey === last.sortKey
        ? formatIsoLocalMedium(first.sortKey)
        : formatIsoDateRange(first.sortKey, last.sortKey);
  } else if (
    overallWindow === "all" &&
    overallSummary.periodsWithScores > 0 &&
    overallSummary.rangeFrom &&
    overallSummary.rangeTo
  ) {
    overallSubtitle =
      overallSummary.periodsWithScores === 1
        ? "Overall average · 1 period"
        : `Overall average · ${overallSummary.periodsWithScores} periods`;
    overallDateSubtitle =
      overallSummary.rangeFrom === overallSummary.rangeTo
        ? formatIsoLocalMedium(overallSummary.rangeFrom)
        : formatIsoDateRange(overallSummary.rangeFrom, overallSummary.rangeTo);
  }

  const scheduleCadence = cadenceOrDefault(orgReviewCadence);
  const reminderSlots = missingCadenceReminders(
    scheduleCadence,
    employee.join_date?.slice(0, 10) ?? null,
    orgQuarterStartMonth,
    reviews.map((r) => ({
      generation_strategy: r.generation_strategy,
      review_cadence: r.review_cadence,
      period_key: r.period_key,
      period_start: r.period_start,
      period_end: r.period_end,
    })),
  );
  const perfSeries = React.useMemo(() => {
    if (overallWindow === "all") return rollupSeries;
    const cutoff = cutoffIsoForWindow(overallWindow);
    return rollupSeries.filter((p) => p.periodStart >= cutoff);
  }, [overallWindow, rollupSeries]);

  const slotEvidence = React.useMemo(() => {
    return [...reminderSlots]
      .map((slot) => {
        const hasAchievement = achievements.some((a) => {
          const anchor =
            a.achievement_date?.slice(0, 10) || a.created_at.slice(0, 10);
          return isWithinRange(anchor, slot.from, slot.to);
        });
        const hasNote = notes.some((n) => {
          const d = n.created_at.slice(0, 10);
          return isWithinRange(d, slot.from, slot.to);
        });
        const hasReview = reviews.some((r) => {
          const from = r.period_start?.slice(0, 10);
          const to = r.period_end?.slice(0, 10);
          if (!from || !to) return false;
          return !(to < slot.from || from > slot.to);
        });
        return {
          slot,
          hasAchievement,
          hasNote,
          hasReview,
          hasEvidence: hasAchievement || hasNote || hasReview,
        };
      })
      .sort((a, b) => b.slot.from.localeCompare(a.slot.from));
  }, [reminderSlots, achievements, notes, reviews]);

  return (
    <div className="relative mx-auto max-w-5xl space-y-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/6 absolute -top-20 right-0 h-64 w-[22rem] rounded-full blur-3xl" />
        <div className="bg-violet-500/8 absolute top-48 -left-16 h-48 w-48 rounded-full blur-3xl" />
      </div>

      <Card className="border-border/70 from-card/95 to-muted/12 relative overflow-hidden bg-gradient-to-br p-5 shadow-lg md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:justify-between">
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
                {reportingTo?.employee_code?.trim() ? (
                  <Badge
                    variant="outline"
                    className="font-normal tabular-nums max-w-[320px] truncate"
                    title={`Reporting to · ${reportingTo.employee_code.trim()} · ${reportingTo.name?.trim() ? reportingTo.name.trim() : "—"}`}
                  >
                    Mgr · {reportingTo.employee_code.trim()} ·{" "}
                    {reportingTo.name?.trim() ? reportingTo.name.trim() : "—"}
                  </Badge>
                ) : null}
                {employee.role ? (
                  <Badge variant="secondary" className="font-normal">
                    {employee.role}
                  </Badge>
                ) : null}
                {employee.department ? (
                  <Badge variant="outline" className="font-normal">
                    {employee.department}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <InsightsOverallRating
            scoreOutOf10={overall10}
            reviewLabel={overallSubtitle}
            reviewDateLabel={overallDateSubtitle}
            className="shrink-0 self-start lg:self-center"
          />
        </div>
        <div className="mt-5 space-y-2">
          <div className="bg-muted/35 inline-flex flex-wrap rounded-xl border border-border/60 p-1">
            {(
              [
                ["all", "Overall"],
                ["month", "Last month"],
                ["quarter", "Last quarter"],
                ["mid_year", "Last mid-year"],
                ["year", "Last year"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setOverallWindow(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  overallWindow === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Selection applies to both overall score and performance trend.
          </p>
        </div>
      </Card>

      <Card className="border-border/70 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Performance trend</CardTitle>
          <CardDescription>
            Overall score (0–10) for the selected window, newest on the right.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InsightsPerformanceChart series={perfSeries} />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-md">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Review schedule & reminders
            </CardTitle>
            <CardDescription>
              Expected {REVIEW_CADENCE_LABELS[scheduleCadence].toLowerCase()} review
              periods without a completed roll-up show as reminders below.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Department cadence:{" "}
            <span className="text-foreground font-medium">
              {REVIEW_CADENCE_LABELS[orgReviewCadence]}
            </span>
            {orgReviewCadence === "quarterly" ? (
              <>
                {" "}
                · quarter starts in{" "}
                <span className="text-foreground font-medium">
                  {new Date(2026, orgQuarterStartMonth - 1, 1).toLocaleString(
                    undefined,
                    { month: "long" },
                  )}
                </span>
              </>
            ) : null}
          </p>
          {slotEvidence.length === 0 ? (
            <p className="text-muted-foreground border-border/60 bg-muted/15 rounded-xl border border-dashed px-4 py-6 text-center text-sm">
              You&apos;re caught up for visible {REVIEW_CADENCE_LABELS[scheduleCadence].toLowerCase()}{" "}
              windows—nice work.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border/60 p-2">
              <ul className="space-y-2">
                {slotEvidence.map(({ slot, hasEvidence, hasAchievement, hasNote, hasReview }) => (
                  <li
                    key={slot.key}
                    className={cn(
                      "border-border/70 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
                      hasEvidence
                        ? "bg-emerald-500/[0.06]"
                        : "bg-amber-500/[0.08] border-amber-500/30",
                    )}
                  >
                    <div>
                      <p className="font-medium leading-snug">{slot.label}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {slot.from} → {slot.to}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px]">
                          Roll-up pending
                        </span>
                        {!hasNote ? (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/12 px-2 py-0.5 text-[11px] text-amber-900 dark:text-amber-200">
                            Notes missing
                          </span>
                        ) : null}
                        {!hasAchievement ? (
                          <span className="rounded-full border border-violet-500/35 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-800 dark:text-violet-200">
                            Achievements missing
                          </span>
                        ) : null}
                        {!hasReview ? (
                          <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-800 dark:text-sky-200">
                            Prior reviews missing
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!hasEvidence ? (
                        <span
                          className="text-muted-foreground inline-flex items-center gap-1 text-xs"
                          title="No notes, achievements, or prior reviews exist for this roll-up window."
                        >
                          <InfoIcon className="size-3.5" />
                          No context yet
                        </span>
                      ) : null}
                      {hasEvidence && !readOnly ? (
                        <Link
                          href={`/employees/${employee.id}/generate-review?cadence=${scheduleCadence}&periodKey=${encodeURIComponent(slot.key)}&from=${slot.from}&to=${slot.to}&label=${encodeURIComponent(slot.label)}`}
                          className={cn(
                            buttonVariants({ variant: "secondary", size: "sm" }),
                            "shrink-0 rounded-lg",
                          )}
                        >
                          Roll-up
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={
                            readOnly
                              ? "This employee is locked because your workspace is over the seat limit."
                              : "No notes, achievements, or prior reviews exist for this roll-up window."
                          }
                          className={cn(
                            buttonVariants({ variant: "secondary", size: "sm" }),
                            "shrink-0 cursor-not-allowed rounded-lg opacity-55",
                          )}
                        >
                          Roll-up
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 overflow-hidden shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
              {achievements.length}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Wins captured to support evidence-rich roll-ups.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 overflow-hidden shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Manager notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
              {notes.length}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Free-form context you curate manually.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 overflow-hidden shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Reviews saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-primary text-3xl font-semibold tabular-nums tracking-tight">
              {reviewSaved}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              HR/admin review records saved for this employee.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 overflow-hidden shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Period-linked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-emerald-600 text-3xl font-semibold tabular-nums tracking-tight dark:text-emerald-400">
              {withPeriod.length}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Reviews with explicit date windows for roll-up cadence.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Signal mix</CardTitle>
            <CardDescription>
              {withPeriod.length} of {reviews.length} reviews carry calendar
              windows—ideal for a roll-up from period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2 border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Area trend (mean)</span>
              <span className="font-semibold tabular-nums">
                {trend !== null ? `${trend} / 5` : "—"}
              </span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Computed from recent review dimension rows when present; falls back
              when reviews use checklist-only scoring.
            </p>
            <Link
              href={`/employees/${employee.id}/generate-review`}
              aria-disabled={readOnly}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "mt-2 w-full justify-center rounded-xl no-underline",
                readOnly ? "pointer-events-none opacity-60" : null,
              )}
              title={
                readOnly
                  ? "This employee is locked because your workspace is over the seat limit."
                  : undefined
              }
            >
              Roll-up from period
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/70 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent manager notes</CardTitle>
            <CardDescription>
              Same items you enter on the profile—always visible on this journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No notes yet.{" "}
                <Link
                  href={`/employees/${employee.id}/insights?tab=notes`}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Add the first note
                </Link>
                .
              </p>
            ) : (
              <ScrollArea className="max-h-[240px] pr-3">
                <ul className="space-y-3">
                  {recentNotes.map((n) => (
                    <li
                      key={n.id}
                      className="border-border/60 bg-muted/15 rounded-xl border px-4 py-3"
                    >
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {formatIsoDate(n.created_at)}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed whitespace-pre-wrap">
                        {n.body.trim() || "(empty)"}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 from-card to-primary/[0.02] overflow-hidden bg-gradient-to-br">
          <CardHeader>
            <CardTitle className="text-base">Latest achievements</CardTitle>
            <CardDescription>
              Recent wins to anchor roll-up summaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAchievements.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Capture wins on the profile to strengthen the next draft.
              </p>
            ) : (
              <div className="h-[320px] overflow-y-auto pr-2">
                <ul className="space-y-2">
                  {recentAchievements.map((a) => (
                    <li
                      key={a.id}
                      className="border-border/70 bg-muted/20 flex items-start gap-3 rounded-xl border px-4 py-3"
                    >
                        <div className="bg-primary/10 text-primary border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold uppercase">
                          Win
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{a.title}</p>
                          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full border border-border/70 px-2 py-0.5">
                              {a.category}
                            </span>
                            <span className="tabular-nums">
                              {(a.achievement_date ?? a.created_at.slice(0, 10)).slice(0, 10)}
                            </span>
                          </div>
                        </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 from-card to-violet-500/[0.03] overflow-hidden bg-gradient-to-br">
          <CardHeader>
            <CardTitle className="text-base">Review narratives</CardTitle>
            <CardDescription>
              Recent narrative snapshots from roll-ups and HR reviews.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {recentReviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No reviews yet.{" "}
                <Link
                  href={`/employees/${employee.id}/generate-review`}
                  className={cn(
                    "text-primary font-medium underline-offset-4 hover:underline",
                    readOnly ? "pointer-events-none opacity-60" : null,
                  )}
                  aria-disabled={readOnly}
                  title={
                    readOnly
                      ? "This employee is locked because your workspace is over the seat limit."
                      : undefined
                  }
                >
                  Start a roll-up review
                </Link>{" "}
                after you capture context.
              </p>
            ) : (
              <div className="h-[320px] overflow-y-auto pr-2">
                <ul className="space-y-2">
                  {recentReviews.map((r) => {
                    const slo = strategyLabel(r.generation_strategy);
                    const body =
                      r.final_review?.trim() ??
                      r.ai_draft?.trim() ??
                      "No narrative saved yet.";
                    return (
                      <li key={r.id}>
                        <div className="border-border/70 bg-muted/20 rounded-xl border px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-medium leading-tight truncate">
                              {reviewTitle(r)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="font-normal capitalize">
                                Saved
                              </Badge>
                              {slo ? (
                                <Badge
                                  variant="secondary"
                                  className="font-normal"
                                >
                                  {slo}
                                </Badge>
                              ) : null}
                              {r.period_start && r.period_end ? (
                                <span className="text-muted-foreground text-xs tabular-nums">
                                  {r.period_start.slice(0, 10)} →{" "}
                                  {r.period_end.slice(0, 10)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No date window
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                              {teaser(body, 200)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 overflow-hidden shadow-md">
        <Tabs defaultValue={tab} orientation="horizontal" className="gap-0">
          <div className="bg-muted/35 border-border/60 border-b px-3 py-2 md:px-4">
            <TabsList className="bg-background/80 h-auto w-full justify-start gap-1 rounded-2xl p-1.5 shadow-sm md:w-auto">
              <TabsTrigger
                value="achievements"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl px-3 py-2"
              >
                <TrophyIcon className="size-3.5" />
                Achievements
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl px-3 py-2"
              >
                <StickyNoteIcon className="size-3.5" />
                Notes
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl px-3 py-2"
              >
                <ClipboardListIcon className="size-3.5" />
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="rollups"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl px-3 py-2"
              >
                <CalendarRangeIcon className="size-3.5" />
                Roll-ups
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="p-4 md:p-6">
            <TabsContent value="achievements" keepMounted={false} className="m-0">
              <div className="max-h-[560px] overflow-y-auto pr-1">
              <AchievementsPanel employeeId={employee.id} achievements={achievements} readOnly={readOnly} />
              </div>
            </TabsContent>
            <TabsContent value="notes" keepMounted={false} className="m-0">
              <div className="max-h-[560px] overflow-y-auto pr-1">
              <EmployeeNotesPanel employeeId={employee.id} notes={notes} readOnly={readOnly} />
              </div>
            </TabsContent>
            <TabsContent value="reviews" keepMounted={false} className="m-0">
              <div className="max-h-[560px] overflow-y-auto pr-1">
              <ReviewsPanel employeeId={employee.id} reviews={reviews} readOnly={readOnly} />
              </div>
            </TabsContent>
            <TabsContent value="rollups" keepMounted={false} className="m-0">
              <div className="max-h-[560px] overflow-y-auto pr-1">
              <RollupsPanel employeeId={employee.id} reviews={reviews} readOnly={readOnly} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
