import Link from "next/link";
import type { ReactElement } from "react";

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
import { cn } from "@/lib/utils";
import { InsightsOverallRating } from "@/components/employees/insights-overall-rating";
import { InsightsCadencePicker } from "@/components/employees/insights-cadence-picker";
import { InsightsPerformanceChart } from "@/components/employees/insights-performance-chart";
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
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return iso;
  }
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export function EmployeeInsightsView({
  employee,
  achievements,
  notes,
  reviews,
}: {
  employee: EmployeeRow;
  achievements: AchievementRow[];
  notes: EmployeeNoteRow[];
  reviews: ReviewWithDimensions[];
}): ReactElement {
  const published = reviews.filter((r) => r.status === "published").length;
  const drafts = reviews.filter((r) => r.status === "draft").length;
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

  const rollupOverall = rollUpOverallScoreSummary(reviews);
  const overall10 = rollupOverall.avg10;

  let overallSubtitle = "";
  let overallDateSubtitle: string | null = null;
  if (
    rollupOverall.periodsWithScores > 0 &&
    rollupOverall.rangeFrom &&
    rollupOverall.rangeTo
  ) {
    overallSubtitle =
      rollupOverall.periodsWithScores === 1
        ? "Based on 1 period"
        : `Avg. across ${rollupOverall.periodsWithScores} periods`;
    overallDateSubtitle =
      rollupOverall.rangeFrom === rollupOverall.rangeTo
        ? formatIsoLocalMedium(rollupOverall.rangeFrom)
        : `${formatIsoLocalMedium(rollupOverall.rangeFrom)} – ${formatIsoLocalMedium(rollupOverall.rangeTo)}`;
  }

  const scheduleCadence = cadenceOrDefault(employee.review_cadence);
  const reminderSlots = missingCadenceReminders(
    scheduleCadence,
    employee.join_date?.slice(0, 10) ?? null,
    reviews.map((r) => ({
      generation_strategy: r.generation_strategy,
      review_cadence: r.review_cadence,
      period_key: r.period_key,
      period_start: r.period_start,
      period_end: r.period_end,
    })),
  );
  const perfSeries = generatedReviewPerformanceSeries(reviews);

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
            className="w-full shrink-0 lg:w-auto lg:self-center"
          />
        </div>
      </Card>

      <Card className="border-border/70 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Performance trend</CardTitle>
          <CardDescription>
            Overall score (0–10) from each roll-up review with ratings, newest on the
            right.
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
          <InsightsCadencePicker
            employeeId={employee.id}
            value={scheduleCadence}
          />
          {reminderSlots.length === 0 ? (
            <p className="text-muted-foreground border-border/60 bg-muted/15 rounded-xl border border-dashed px-4 py-6 text-center text-sm">
              You&apos;re caught up for visible {REVIEW_CADENCE_LABELS[scheduleCadence].toLowerCase()}{" "}
              windows—nice work.
            </p>
          ) : (
            <ul className="space-y-2">
              {reminderSlots.slice(0, 8).map((slot) => (
                <li
                  key={slot.key}
                  className="border-border/70 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/[0.12] px-4 py-3"
                >
                  <div>
                    <p className="font-medium leading-snug">{slot.label}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {slot.from} → {slot.to}
                    </p>
                  </div>
                  <Link
                    href={`/employees/${employee.id}/generate-review`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "shrink-0 rounded-lg",
                    )}
                  >
                    Roll-up
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {reminderSlots.length > 8 ? (
            <p className="text-muted-foreground text-center text-xs">
              Showing 8 of {reminderSlots.length} open slots—raise cadence or clear
              older periods first.
            </p>
          ) : null}
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
              Review drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-primary text-3xl font-semibold tabular-nums tracking-tight">
              {drafts}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Drafts awaiting polish or finalize.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 overflow-hidden shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Finalized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-emerald-600 text-3xl font-semibold tabular-nums tracking-tight dark:text-emerald-400">
              {published}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Published reviews you can stitch into longer roll-ups.
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
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "mt-2 w-full justify-center rounded-xl no-underline",
              )}
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
                  href={`/employees/${employee.id}?tab=notes`}
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
                        {new Date(n.created_at).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
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
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Latest achievements</CardTitle>
            <CardDescription>
              Newest entries first—great anchors for a period roll-up draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentAchievements.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Capture wins on the profile to strengthen the next draft.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentAchievements.map((a) => (
                  <li
                    key={a.id}
                    className="border-border/70 flex gap-3 rounded-xl border px-4 py-3"
                  >
                    <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-primary uppercase">
                      Win
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{a.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {a.category}
                        {a.achievement_date
                          ? ` · ${a.achievement_date.slice(0, 10)}`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Review narratives</CardTitle>
            <CardDescription>
              Excerpts from generated or manual summaries—jump in to edit or
              publish.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentReviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No reviews yet.{" "}
                <Link
                  href={`/employees/${employee.id}/generate-review`}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Start a roll-up review
                </Link>{" "}
                after you capture context.
              </p>
            ) : (
              <ScrollArea className="max-h-[min(340px,50vh)] pr-3">
                <ul className="divide-border/60 divide-y rounded-xl border border-border/70">
                  {recentReviews.map((r) => {
                    const slo = strategyLabel(r.generation_strategy);
                    const body =
                      r.final_review?.trim() ??
                      r.ai_draft?.trim() ??
                      "No narrative saved yet.";
                    return (
                      <li key={r.id}>
                        <div className="hover:bg-muted/25 flex flex-col gap-2 px-4 py-3 transition-colors sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-tight">
                              {reviewTitle(r)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="font-normal capitalize">
                                {r.status === "published"
                                  ? "Finalized"
                                  : r.status === "archived"
                                    ? "Shelved"
                                    : "Draft"}
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
                          <Link
                            href={`/employees/${employee.id}?tab=reviews`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "shrink-0 self-start",
                            )}
                          >
                            Open
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
