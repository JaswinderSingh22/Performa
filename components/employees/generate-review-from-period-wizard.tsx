"use client";

import type { ReactElement } from "react";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PenLineIcon,
  SparklesIcon,
  StickyNoteIcon,
  TrophyIcon,
} from "lucide-react";

import {
  previewEmployeePeriodEvidence,
  type PeriodEvidenceAchievement,
  type PeriodEvidenceNote,
} from "@/actions/employee-evidence-preview";
import { assistReviewFromPeriod } from "@/actions/review-ai";
import { createReview } from "@/actions/reviews";
import {
  cadencePresets,
  inferPeriodKeyFromBounds,
  REVIEW_CADENCE_LABELS,
  type CadencePreset,
} from "@/lib/review-cadence";
import { encompassingRange } from "@/lib/period-range";
import type { ReviewCadence } from "@/types/database";
import { emptyChecklistState } from "@/lib/review-checklist";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StitchableReviewOption = {
  id: string;
  title: string | null;
  period_start: string;
  period_end: string;
};

type GenerationStrategy = "raw_period" | "stitched_summaries";
type WizardStep = "setup" | "context" | "refine";

const steps: { id: WizardStep; label: string }[] = [
  { id: "setup", label: "Range" },
  { id: "context", label: "Evidence" },
  { id: "refine", label: "Review & save" },
];

const CADENCE_SEQUENCE: readonly ReviewCadence[] = [
  "monthly",
  "quarterly",
  "mid_year",
  "yearly",
];

/** Seed rows when filing a manual roll-up (no AI). */
const MANUAL_DIMENSION_TEMPLATE: {
  label: string;
  analysis: string;
  rating: number;
}[] = [
  { label: "Delivery & execution", analysis: "", rating: 3 },
  { label: "Communication & collaboration", analysis: "", rating: 3 },
  { label: "Technical / craft skills", analysis: "", rating: 3 },
  { label: "Initiative & accountability", analysis: "", rating: 3 },
  { label: "Growth & potential", analysis: "", rating: 3 },
];

export function GenerateReviewFromPeriodWizard({
  employeeId,
  employeeName,
  employeeJoinDate,
  readOnly = false,
  defaultCadence,
  quarterStartMonth,
  lockedPeriod,
  stitchableReviews,
  contextCounts,
}: {
  employeeId: string;
  employeeName: string;
  employeeJoinDate: string | null;
  readOnly?: boolean;
  defaultCadence: ReviewCadence;
  quarterStartMonth: number;
  lockedPeriod?: {
    cadence: ReviewCadence | null;
    periodKey: string | null;
    label: string | null;
    from: string;
    to: string;
  } | null;
  stitchableReviews: StitchableReviewOption[];
  contextCounts: { achievements: number; notes: number; reviews: number };
}): ReactElement {
  const router = useRouter();

  const lockedReason = readOnly
    ? "This employee is locked because your workspace is over the seat limit. Upgrade or remove employees to unlock roll-ups."
    : null;

  const canUseAi =
    contextCounts.achievements + contextCounts.notes + contextCounts.reviews > 0;

  const [draftMode, setDraftMode] = React.useState<"ai" | "manual">("manual");
  const [usedAiAssist, setUsedAiAssist] = React.useState(false);

  React.useEffect(() => {
    if (!canUseAi) setDraftMode("manual");
  }, [canUseAi]);

  const [step, setStep] = React.useState<WizardStep>("setup");
  const [strategy, setStrategy] = React.useState<GenerationStrategy>("raw_period");
  const [cycleCadence, setCycleCadence] =
    React.useState<ReviewCadence>(lockedPeriod?.cadence ?? defaultCadence);
  const [periodKey, setPeriodKey] = React.useState(lockedPeriod?.periodKey ?? "");
  const joinDateIso = employeeJoinDate?.slice(0, 10) ?? null;
  const presetList = React.useMemo(
    () => cadencePresets(cycleCadence, joinDateIso, quarterStartMonth),
    [cycleCadence, joinDateIso, quarterStartMonth],
  );
  const [title, setTitle] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState(lockedPeriod?.from ?? "");
  const [dateTo, setDateTo] = React.useState(lockedPeriod?.to ?? "");
  const [selectedStitchIds, setSelectedStitchIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  React.useEffect(() => {
    if (!lockedPeriod) return;
    setStrategy("raw_period");
    if (lockedPeriod.cadence) setCycleCadence(lockedPeriod.cadence);
    if (lockedPeriod.periodKey) setPeriodKey(lockedPeriod.periodKey);
    setDateFrom(lockedPeriod.from);
    setDateTo(lockedPeriod.to);
    setSelectedStitchIds(new Set());
  }, [lockedPeriod]);

  const [evidenceBusy, setEvidenceBusy] = React.useState(false);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [saveBusy, setSaveBusy] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);

  const [evidenceAchievements, setEvidenceAchievements] = React.useState<
    PeriodEvidenceAchievement[] | null
  >(null);
  const [evidenceNotes, setEvidenceNotes] = React.useState<PeriodEvidenceNote[] | null>(
    null,
  );

  const [refineTitle, setRefineTitle] = React.useState("");
  const [refineFinal, setRefineFinal] = React.useState("");
  const [refineDraft, setRefineDraft] = React.useState("");
  const [refineDims, setRefineDims] = React.useState<
    { label: string; analysis: string; rating: number }[]
  >([]);

  const navSteps = React.useMemo(() => {
    const manualRawSkipsEvidence =
      draftMode === "manual" && strategy === "raw_period";
    if (manualRawSkipsEvidence) {
      return [
        { id: "setup" as WizardStep, label: "Range" },
        { id: "refine" as WizardStep, label: "Review & save" },
      ];
    }
    return steps;
  }, [draftMode, strategy]);

  const prepareManualRefine = React.useCallback((): void => {
    setUsedAiAssist(false);
    setRefineDims(MANUAL_DIMENSION_TEMPLATE.map((d) => ({ ...d })));
    setRefineFinal("");
    setRefineDraft("");
    setRefineTitle(
      title.trim() ||
        `Performance roll-up · ${dateFrom.trim()} – ${dateTo.trim()}`,
    );
  }, [title, dateFrom, dateTo]);

  const selectedStitchReviews = stitchableReviews.filter((r) =>
    selectedStitchIds.has(r.id),
  );

  const stitchEnvelope = React.useMemo(() => {
    if (selectedStitchReviews.length === 0) return null;
    return encompassingRange(
      selectedStitchReviews.map((r) => ({
        from: r.period_start.slice(0, 10),
        to: r.period_end.slice(0, 10),
      })),
    );
  }, [selectedStitchReviews]);

  React.useEffect(() => {
    if (strategy !== "stitched_summaries" || !stitchEnvelope) return;
    setDateFrom(stitchEnvelope.from);
    setDateTo(stitchEnvelope.to);
  }, [strategy, stitchEnvelope]);

  const applyCadencePreset = (p: CadencePreset): void => {
    setStrategy("raw_period");
    setSelectedStitchIds(new Set());
    setDateFrom(p.from);
    setDateTo(p.to);
    setPeriodKey(p.key);
    setClientError(null);
  };

  const selectCadence = (c: ReviewCadence): void => {
    setCycleCadence(c);
    setStrategy("raw_period");
    setSelectedStitchIds(new Set());
    setDateFrom("");
    setDateTo("");
    setPeriodKey("");
    setClientError(null);
  };

  const toggleStitch = (id: string): void => {
    setStrategy("stitched_summaries");
    setSelectedStitchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setClientError(null);
  };

  React.useEffect(() => {
    if (strategy !== "raw_period" || !dateFrom || !dateTo) return;
    const inf = inferPeriodKeyFromBounds(
      cycleCadence,
      dateFrom.trim(),
      dateTo.trim(),
      quarterStartMonth,
    );
    if (inf) setPeriodKey(inf);
  }, [dateFrom, dateTo, cycleCadence, strategy, quarterStartMonth]);

  function validateSetup(): boolean {
    setClientError(null);
    if (!dateFrom.trim() || !dateTo.trim()) {
      setClientError("Pick a start and end date (range is required).");
      return false;
    }
    if (dateFrom > dateTo) {
      setClientError("Range start must be on or before the end date.");
      return false;
    }
    if (strategy === "stitched_summaries") {
      if (selectedStitchIds.size < 1) {
        setClientError("Select at least one prior quarter review to stitch.");
        return false;
      }
      if (
        stitchEnvelope &&
        (dateFrom !== stitchEnvelope.from || dateTo !== stitchEnvelope.to)
      ) {
        setClientError(
          `Stitching requires exactly ${stitchEnvelope.from} → ${stitchEnvelope.to}.`,
        );
        return false;
      }
    }
    if (strategy === "raw_period") {
      const inf = inferPeriodKeyFromBounds(
        cycleCadence,
        dateFrom.trim(),
        dateTo.trim(),
      quarterStartMonth,
      );
      if (!inf && !periodKey.trim()) {
        setClientError(
          "Pick a preset range (or a valid full cadence window) before continuing.",
        );
        return false;
      }
    }
    return true;
  }

  const goPreviewContext = async (): Promise<void> => {
    if (!validateSetup()) return;

    setClientError(null);
    if (strategy === "raw_period") {
      setEvidenceBusy(true);
      try {
        const preview = await previewEmployeePeriodEvidence({
          employeeId,
          dateFrom: dateFrom.trim(),
          dateTo: dateTo.trim(),
        });
        if (!preview.ok) {
          setClientError(preview.error);
          return;
        }
        setEvidenceAchievements(preview.data.achievements);
        setEvidenceNotes(preview.data.notes);
        setStep("context");
      } finally {
        setEvidenceBusy(false);
      }
      return;
    }

    setEvidenceAchievements([]);
    setEvidenceNotes([]);
    setStep("context");
  };

  const continueFromSetup = (): void => {
    if (readOnly) {
      setClientError(lockedReason);
      return;
    }
    if (!validateSetup()) return;
    setClientError(null);
    if (draftMode === "manual") {
      if (strategy === "stitched_summaries") {
        setEvidenceAchievements([]);
        setEvidenceNotes([]);
        setStep("context");
        return;
      }
      prepareManualRefine();
      setStep("refine");
      return;
    }
    void goPreviewContext();
  };

  const continueManualFromContext = (): void => {
    prepareManualRefine();
    setStep("refine");
  };

  const runAi = async (): Promise<void> => {
    if (readOnly) {
      setClientError(lockedReason);
      return;
    }
    setClientError(null);
    setAiBusy(true);
    try {
      const assistPayload =
        strategy === "raw_period"
          ? {
              strategy: "raw_period" as const,
              employeeId,
              dateFrom: dateFrom.trim(),
              dateTo: dateTo.trim(),
              title: title.trim() || undefined,
            }
          : {
              strategy: "stitched_summaries" as const,
              employeeId,
              dateFrom: dateFrom.trim(),
              dateTo: dateTo.trim(),
              title: title.trim() || undefined,
              sourceReviewIds: [...selectedStitchIds],
            };

      const assist = await assistReviewFromPeriod(assistPayload);
      if (!assist.ok) {
        setClientError(assist.error);
        return;
      }

      const reviewTitleDefault =
        title.trim() ||
        (strategy === "stitched_summaries"
          ? `Stitched roll-up · ${dateFrom} – ${dateTo}`
          : `Performance roll-up · ${dateFrom} – ${dateTo}`);

      setRefineTitle(reviewTitleDefault);
      setRefineFinal(assist.data.final_review);
      setRefineDraft(assist.data.ai_draft);
      setRefineDims(
        assist.data.dimensions.map((d) => ({
          label: d.label,
          analysis: d.analysis,
          rating: d.rating,
        })),
      );
      setUsedAiAssist(true);
      setStep("refine");
    } finally {
      setAiBusy(false);
    }
  };

  const saveDraft = async (): Promise<void> => {
    if (readOnly) {
      setClientError(lockedReason);
      return;
    }
    setClientError(null);

    const t = refineTitle.trim();
    if (!t) {
      setClientError("Give this review a title before saving.");
      return;
    }
    const finalT = refineFinal.trim();
    if (finalT.length < 15) {
      setClientError("Final summary needs at least 15 characters.");
      return;
    }
    const dims = refineDims
      .map((d) => ({
        label: d.label.trim(),
        analysis: (d.analysis ?? "").trim(),
        rating: d.rating,
      }))
      .filter((d) => d.label.length > 0);
    if (dims.length === 0) {
      setClientError("Keep at least one performance area with a label.");
      return;
    }

    setSaveBusy(true);
    try {
      const createPayload = {
        employeeId,
        title: t,
        status: "draft" as const,
        rating: null as number | null,
        dimensions: dims,
        checklist: emptyChecklistState(),
        ai_draft: refineDraft.trim(),
        final_review: finalT,
        periodStart: dateFrom.trim(),
        periodEnd: dateTo.trim(),
        generationStrategy: strategy,
        ...(strategy === "raw_period"
          ? {
              reviewCadence: cycleCadence,
              periodKey:
                inferPeriodKeyFromBounds(
                  cycleCadence,
                  dateFrom.trim(),
                  dateTo.trim(),
                  quarterStartMonth,
                ) ?? periodKey.trim(),
            }
          : {
              reviewCadence: "quarterly" as const,
            }),
        ...(strategy === "stitched_summaries"
          ? { sourceReviewIds: [...selectedStitchIds] }
          : {}),
      };

      const created = await createReview(createPayload);
      if (!created.ok) {
        setClientError(created.error);
        return;
      }

      router.push(`/employees/${employeeId}/insights`);
      router.refresh();
    } finally {
      setSaveBusy(false);
    }
  };

  const backFromRefine = (): void => {
    if (usedAiAssist) return;
    if (draftMode === "manual" && strategy === "stitched_summaries") {
      setStep("context");
      return;
    }
    setStep("setup");
  };

  const setupContinueDisabled =
    !dateFrom.trim() ||
    !dateTo.trim() ||
    evidenceBusy ||
    (strategy === "stitched_summaries" && selectedStitchIds.size < 1);

  const setupContinueLabel =
    draftMode === "manual"
      ? strategy === "stitched_summaries"
        ? "Continue"
        : "Continue to manual roll-up"
      : "Continue";

  const stepIndex = navSteps.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {readOnly ? (
        <p className="border-border/60 bg-muted/25 text-muted-foreground rounded-xl border px-4 py-3 text-sm leading-relaxed">
          {lockedReason}
        </p>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/employees/${employeeId}/insights`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 h-auto px-2 py-0",
          )}
        >
          ← {employeeName}
        </Link>

        <nav
          className="bg-muted/40 flex items-center gap-1 rounded-full border border-border/60 px-1.5 py-1"
          aria-label="Steps"
        >
          {navSteps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                step === s.id
                  ? "bg-background text-foreground shadow-sm"
                  : i < stepIndex
                    ? "text-primary"
                    : "text-muted-foreground",
              )}
            >
              <span className="tabular-nums">{i + 1}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </nav>
      </div>

      {clientError ? (
        <p className="text-destructive bg-destructive/8 rounded-xl border border-destructive/20 px-4 py-3 text-sm" role="alert">
          {clientError}
        </p>
      ) : null}

      {step === "setup" ? (
        <Card className="border-border/70 overflow-hidden shadow-lg">
          <CardHeader className="border-border/60 from-primary/[0.04] border-b bg-gradient-to-br to-transparent pb-6">
            <CardTitle className="font-heading text-xl tracking-tight md:text-2xl">
              Configure roll-up
            </CardTitle>
            <CardDescription className="max-w-xl text-[15px] leading-relaxed">
              {lockedPeriod ? (
                <>
                  Period is preselected from reminders. Choose{" "}
                  <span className="text-foreground font-medium">manual entry</span>{" "}
                  or{" "}
                  <span className="text-foreground font-medium">AI-assisted draft</span>
                  .
                </>
              ) : (
                <>
                  Set the calendar window first. Then choose{" "}
                  <span className="text-foreground font-medium">manual entry</span> (no
                  AI cost) or{" "}
                  <span className="text-foreground font-medium">AI-assisted draft</span>{" "}
                  when you have profile context.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="grid gap-2">
              <Label htmlFor="cyc-title">Review title (optional for now)</Label>
              <Input
                id="cyc-title"
                placeholder={`${employeeName} · H1`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
              />
            </div>

            {!canUseAi ? (
              <div className="border-amber-500/35 bg-amber-500/8 rounded-xl border px-4 py-4 text-sm">
                <p className="text-foreground font-medium">
                  No profile context yet — AI drafting is off
                </p>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  This employee has{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {contextCounts.notes}
                  </span>{" "}
                  notes,{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {contextCounts.achievements}
                  </span>{" "}
                  achievements, and{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {contextCounts.reviews}
                  </span>{" "}
                  reviews. Add notes or wins on the profile to unlock AI, or continue
                  with a{" "}
                  <span className="text-foreground font-medium">manual roll-up</span>{" "}
                  below (required fields on the next step — no tokens).
                </p>
                <Link
                  href={`/employees/${employeeId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-4",
                  )}
                >
                  Add notes or achievements first
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-base">How do you want to draft?</Label>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Manual saves tokens. AI uses dated notes, achievements, and existing
                  reviews as context.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDraftMode("manual")}
                    className={cn(
                      "border-border hover:border-primary/35 hover:bg-muted/30 flex flex-col gap-2 rounded-xl border bg-transparent p-4 text-left transition-colors",
                      draftMode === "manual" &&
                        "border-primary ring-primary/20 ring-2",
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <PenLineIcon className="size-4" aria-hidden />
                      Manual only
                    </span>
                    <span className="text-muted-foreground text-xs leading-relaxed">
                      You fill title, summary, and performance areas. No AI API calls.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftMode("ai")}
                    className={cn(
                      "border-border hover:border-primary/35 hover:bg-muted/30 flex flex-col gap-2 rounded-xl border bg-transparent p-4 text-left transition-colors",
                      draftMode === "ai" &&
                        "border-primary ring-primary/20 ring-2",
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <SparklesIcon className="size-4" aria-hidden />
                      Assist with AI
                    </span>
                    <span className="text-muted-foreground text-xs leading-relaxed">
                      Preview evidence, then generate a draft you can edit before save.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {lockedPeriod ? (
              <div className="border-border/70 bg-muted/[0.2] space-y-2 rounded-xl border p-4">
                <Label className="text-base">Selected roll-up window</Label>
                <p className="text-muted-foreground text-sm">
                  {lockedPeriod.label ?? "Selected period"}
                </p>
                <p className="text-foreground text-sm tabular-nums">
                  {lockedPeriod.from} → {lockedPeriod.to}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label className="text-base">Roll-up cadence</Label>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Monthly, quarterly, mid-year (two halves), or full-year schedules.
                    Presets keep dates aligned with reminders.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CADENCE_SEQUENCE.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        size="sm"
                        variant={cycleCadence === c ? "default" : "outline"}
                        className="h-9 rounded-full px-4 text-xs"
                        onClick={() => selectCadence(c)}
                      >
                        {REVIEW_CADENCE_LABELS[c]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Roll-up period presets</Label>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    One tap sets the evidence window for raw mode—only notes and achievements dated inside count.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {presetList.map((p) => (
                      <Button
                        key={p.key}
                        type="button"
                        size="sm"
                        variant={
                          dateFrom === p.from && dateTo === p.to ? "default" : "outline"
                        }
                        className="h-9 rounded-full px-4 text-xs"
                        onClick={() => applyCadencePreset(p)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="cyc-from">Roll-up start</Label>
                    <Input
                      id="cyc-from"
                      type="date"
                      value={dateFrom}
                      disabled={
                        strategy === "stitched_summaries" &&
                        selectedStitchIds.size > 0 &&
                        stitchEnvelope !== null
                      }
                      onChange={(e) => {
                        setStrategy("raw_period");
                        setSelectedStitchIds(new Set());
                        setDateFrom(e.target.value);
                      }}
                      className="h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cyc-to">Roll-up end</Label>
                    <Input
                      id="cyc-to"
                      type="date"
                      value={dateTo}
                      disabled={
                        strategy === "stitched_summaries" &&
                        selectedStitchIds.size > 0 &&
                        stitchEnvelope !== null
                      }
                      onChange={(e) => {
                        setStrategy("raw_period");
                        setSelectedStitchIds(new Set());
                        setDateTo(e.target.value);
                      }}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="border-border/70 space-y-3 rounded-xl border bg-muted/[0.2] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Label className="text-base">Or stitch prior quarters</Label>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    Combines narratives you already saved—fewer tokens, longer
                    spans.
                  </p>
                </div>
                {strategy === "stitched_summaries" && selectedStitchIds.size > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStitchIds(new Set());
                      setStrategy("raw_period");
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              {stitchableReviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No eligible quarter drafts yet—create ranged reviews in raw mode first.
                </p>
              ) : (
                <ul className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
                  {stitchableReviews.map((row) => {
                    const checked = selectedStitchIds.has(row.id);
                    return (
                      <li key={row.id}>
                        <label className="hover:bg-background/70 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors">
                          <input
                            type="checkbox"
                            className="text-primary size-4 rounded border-input"
                            checked={checked}
                            onChange={() => toggleStitch(row.id)}
                          />
                          <span className="min-w-0 text-sm">
                            <span className="font-medium">
                              {row.title?.trim() || "Performance review"}
                            </span>
                            <span className="text-muted-foreground block text-xs tabular-nums">
                              {row.period_start.slice(0, 10)} →{" "}
                              {row.period_end.slice(0, 10)}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
              </>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                className="gap-2 rounded-xl px-6"
                disabled={setupContinueDisabled || readOnly}
                onClick={() => continueFromSetup()}
                title={readOnly ? lockedReason ?? undefined : undefined}
              >
                {evidenceBusy ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Loading preview…
                  </>
                ) : (
                  <>
                    {setupContinueLabel}
                    <ChevronRightIcon className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "context" ? (
        <Card className="border-border/70 shadow-lg">
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              {strategy === "raw_period" ? "Evidence in this range" : "Sources to merge"}
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {strategy === "raw_period"
                ? draftMode === "ai"
                  ? "These are the notes and achievements whose dates fall inside your window. Only this context is sent to the model."
                  : "Review what falls in this window. You’ll enter the final narrative manually on the next step."
                : "These quarterly narratives will be merged. Next, either fill the review yourself or run AI if you chose Assist with AI in step 1."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {strategy === "raw_period" && evidenceAchievements && evidenceNotes ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border-border/60 bg-muted/15 rounded-xl border p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                      <StickyNoteIcon className="size-3.5" />
                      Notes
                    </div>
                    <p className="font-heading mt-2 text-3xl font-semibold tabular-nums">
                      {evidenceNotes.length}
                    </p>
                  </div>
                  <div className="border-border/60 bg-muted/15 rounded-xl border p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                      <TrophyIcon className="size-3.5" />
                      Achievements
                    </div>
                    <p className="font-heading mt-2 text-3xl font-semibold tabular-nums">
                      {evidenceAchievements.length}
                    </p>
                  </div>
                </div>

                {evidenceNotes.length === 0 && evidenceAchievements.length === 0 ? (
                  <div className="border-border bg-muted/20 rounded-xl border border-dashed p-8 text-center">
                    <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
                      Nothing dated in this window yet—you can still generate, but the
                      narrative will rely on sparse context. Adjust the range or add
                      records from the employee profile.
                    </p>
                    <Link
                      href={`/employees/${employeeId}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-6",
                      )}
                    >
                      Go to profile
                    </Link>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[min(52vh,420px)] rounded-xl border border-border/70">
                    <ul className="divide-border/60 divide-y p-4">
                      {evidenceAchievements.map((a) => (
                        <li key={`a-${a.id}`} className="gap-4 py-3 first:pt-0">
                          <div className="text-primary flex items-center gap-2 text-xs font-semibold">
                            <TrophyIcon className="size-3.5 shrink-0" />
                            Achievement
                            <span className="text-muted-foreground tabular-nums font-normal">
                              · {achievementAnchorDate(a)}
                            </span>
                          </div>
                          <p className="font-medium leading-snug">{a.title}</p>
                          <p className="text-muted-foreground text-xs">{a.category}</p>
                        </li>
                      ))}
                      {evidenceNotes.map((n) => (
                        <li key={`n-${n.id}`} className="gap-4 py-3">
                          <div className="text-primary flex items-center gap-2 text-xs font-semibold">
                            <StickyNoteIcon className="size-3.5 shrink-0" />
                            Note ·{" "}
                            <span className="tabular-nums font-normal">
                              {n.created_at.slice(0, 10)}
                            </span>
                          </div>
                          <p className="text-foreground text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
                            {n.body.trim() || "(empty)"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </>
            ) : strategy === "stitched_summaries" ? (
              <ul className="space-y-3">
                {selectedStitchReviews.map((r) => (
                  <li
                    key={r.id}
                    className="border-border/60 bg-card/60 flex flex-col gap-1 rounded-xl border px-4 py-3"
                  >
                    <span className="font-medium">
                      {r.title?.trim() || "Performance review"}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {r.period_start.slice(0, 10)} → {r.period_end.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setStep("setup");
                  setClientError(null);
                }}
              >
                <ArrowLeftIcon className="size-4" />
                Back
              </Button>
              {draftMode === "manual" ? (
                <Button
                  type="button"
                  size="lg"
                  className="gap-2 rounded-xl px-6"
                  onClick={() => continueManualFromContext()}
                >
                  Continue to required fields
                  <ChevronRightIcon className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="gap-2 rounded-xl px-6"
                  disabled={aiBusy || readOnly}
                  onClick={() => void runAi()}
                  title={readOnly ? lockedReason ?? undefined : undefined}
                >
                  {aiBusy ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="size-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "refine" ? (
        <Card className="border-border/70 shadow-lg">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-heading text-xl">
                Complete this roll-up
              </CardTitle>
              <Badge variant={usedAiAssist ? "default" : "secondary"}>
                {usedAiAssist ? "AI-assisted draft" : "Manual roll-up"}
              </Badge>
            </div>
            <CardDescription>
              {usedAiAssist
                ? "Edit the generated draft before saving, or go back to regenerate."
                : "Fill in every required field below. Nothing was sent to the AI."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="refine-title">
                Roll-up title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="refine-title"
                value={refineTitle}
                onChange={(e) => setRefineTitle(e.target.value)}
                className="h-11 font-medium"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="refine-final">
                Final summary <span className="text-destructive">*</span> (minimum
                15 characters)
              </Label>
              <Textarea
                id="refine-final"
                rows={10}
                value={refineFinal}
                onChange={(e) => setRefineFinal(e.target.value)}
                className="min-h-[220px] resize-y"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="refine-draft">
                Working draft <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="refine-draft"
                rows={6}
                value={refineDraft}
                onChange={(e) => setRefineDraft(e.target.value)}
                className="min-h-[120px] resize-y"
              />
            </div>

            <Separator />

            <div className="grid gap-3">
              <Label className="text-base">
                Performance areas <span className="text-destructive">*</span>
              </Label>
              <p className="text-muted-foreground text-xs">
                At least one labeled area with a score. Analysis supports your summary.
              </p>
              <ScrollArea className="max-h-[320px] rounded-xl border border-border/70 p-3">
                <ul className="space-y-4">
                  {refineDims.map((d, idx) => (
                    <li
                      key={`${idx}-${d.label.slice(0, 12)}`}
                      className="bg-muted/20 space-y-2 rounded-xl border border-border/50 p-4"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <Input
                          value={d.label}
                          onChange={(e) => {
                            const next = [...refineDims];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setRefineDims(next);
                          }}
                          className="min-w-[140px] flex-1 font-medium"
                          placeholder="Area label"
                        />
                        <select
                          aria-label={`Rating for ${d.label}`}
                          value={d.rating}
                          onChange={(e) => {
                            const next = [...refineDims];
                            next[idx] = {
                              ...next[idx],
                              rating: Number(e.target.value),
                            };
                            setRefineDims(next);
                          }}
                          className="border-input bg-background focus-visible:border-ring h-11 rounded-lg border px-3 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} / 5
                            </option>
                          ))}
                        </select>
                      </div>
                      <Textarea
                        rows={3}
                        value={d.analysis}
                        onChange={(e) => {
                          const next = [...refineDims];
                          next[idx] = {
                            ...next[idx],
                            analysis: e.target.value,
                          };
                          setRefineDims(next);
                        }}
                        placeholder="Evidence / themes"
                      />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>

            <div className="flex flex-wrap gap-3 border-t pt-6">
              {!usedAiAssist ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={saveBusy}
                  onClick={() => backFromRefine()}
                >
                  <ArrowLeftIcon className="size-4" />
                  Back
                </Button>
              ) : null}
              {usedAiAssist ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={saveBusy || aiBusy}
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      !window.confirm(
                        "Return to the evidence step? Your edits here are kept until you regenerate.",
                      )
                    ) {
                      return;
                    }
                    setStep("context");
                    setClientError(null);
                  }}
                >
                  Regenerate with AI
                </Button>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="rounded-xl px-8"
                disabled={saveBusy || readOnly}
                onClick={() => void saveDraft()}
                title={readOnly ? lockedReason ?? undefined : undefined}
              >
                {saveBusy ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save draft roll-up"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function achievementAnchorDate(row: PeriodEvidenceAchievement): string {
  return row.achievement_date && row.achievement_date.trim().length > 0
    ? row.achievement_date.slice(0, 10)
    : row.created_at.slice(0, 10);
}
