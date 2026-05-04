"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import {
  CalendarRangeIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RocketIcon,
  Trash2Icon,
} from "lucide-react";

import {
  createReview,
  deleteReview,
  publishReview,
  updateReview,
} from "@/actions/reviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewStatus, ReviewWithDimensions } from "@/types/database";
import {
  reviewFieldsSchema,
  type ReviewFieldsFormValues,
} from "@/validators/review";
import { cn } from "@/lib/utils";
import {
  CHECKLIST_TOTAL_WEIGHT,
  PERFORMANCE_CHECKLIST,
  checklistProgress,
  normalizeChecklistForStorage,
  normalizeChecklistFromUnknown,
  ratingFromChecklist,
} from "@/lib/review-checklist";

const DEFAULT_DIMENSION_ROWS: Pick<
  ReviewFieldsFormValues["dimensions"][number],
  "label" | "analysis" | "rating"
>[] = [
  { label: "Delivery & execution", analysis: "", rating: 3 },
  { label: "Communication & collaboration", analysis: "", rating: 3 },
  { label: "Technical / craft skills", analysis: "", rating: 3 },
  { label: "Initiative & accountability", analysis: "", rating: 3 },
  { label: "Growth & potential", analysis: "", rating: 3 },
];

function reviewTitle(row: ReviewWithDimensions): string {
  const t = row.title?.trim();
  return t && t.length > 0 ? t : "Performance review";
}

function statusBadge(status: ReviewStatus): {
  variant: "default" | "secondary" | "outline";
  label: string;
} {
  switch (status) {
    case "published":
      return { variant: "default", label: "Finalized" };
    case "archived":
      return { variant: "secondary", label: "Shelved" };
    default:
      return { variant: "outline", label: "Draft" };
  }
}

function deriveOverall(dimensions: { rating: number }[]): number | null {
  if (!dimensions?.length) return null;
  const avg =
    dimensions.reduce((acc, row) => acc + row.rating, 0) / dimensions.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
}

function buildDefaults(review: ReviewWithDimensions | null): ReviewFieldsFormValues {
  const dimsFromDb = review?.review_dimensions
    ? [...review.review_dimensions].sort(
        (a, b) => a.sort_order - b.sort_order,
      )
    : [];
  const dimensions =
    dimsFromDb.length > 0
      ? dimsFromDb.map((d) => ({
          label: d.label,
          analysis: d.analysis ?? "",
          rating: d.rating,
        }))
      : review === null
        ? [...DEFAULT_DIMENSION_ROWS]
        : [];

  const checklist = normalizeChecklistFromUnknown(review?.checklist);

  const checklistRating =
    ratingFromChecklist(normalizeChecklistForStorage(checklist));

  let ratingPreview: number | "" = "";
  if (checklistRating !== null) {
    ratingPreview = checklistRating;
  } else if (review?.rating != null && review.rating !== undefined) {
    ratingPreview = review.rating;
  } else if (dimensions.length > 0) {
    const d = deriveOverall(dimensions);
    ratingPreview = d !== null ? d : "";
  }

  return {
    title: review ? reviewTitle(review) : "",
    status: review?.status ?? "draft",
    rating:
      ratingPreview === "" ||
      ratingPreview === null ||
      ratingPreview === undefined
        ? ""
        : ratingPreview,
    checklist,
    dimensions,
    ai_draft: review?.ai_draft ?? "",
    final_review: review?.final_review ?? "",
  };
}

function ReviewFormDialog({
  open,
  onOpenChange,
  employeeId,
  review,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  review: ReviewWithDimensions | null;
}): React.ReactElement {
  const router = useRouter();
  const isEdit = review !== null;

  const form = useForm<ReviewFieldsFormValues>({
    resolver: zodResolver(reviewFieldsSchema),
    defaultValues: buildDefaults(review),
  });

  const dimensionsFA = useFieldArray({
    control: form.control,
    name: "dimensions",
  });

  const watchedDims = useWatch({
    control: form.control,
    name: "dimensions",
  }) as ReviewFieldsFormValues["dimensions"];

  const watchedChecklist =
    useWatch({ control: form.control, name: "checklist" }) as ReviewFieldsFormValues["checklist"];

  const normalizedChecklistLive = normalizeChecklistForStorage(
    watchedChecklist ?? {},
  );
  const checklistOfficial = ratingFromChecklist(normalizedChecklistLive);
  const checklistStats = checklistProgress(normalizedChecklistLive);

  React.useEffect(() => {
    if (!open) return;
    form.reset(buildDefaults(review));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reopen snapshot
  }, [review, open]);

  const derivedOverall = deriveOverall(watchedDims ?? []);

  const onSubmit = form.handleSubmit(async (values) => {
    const dimensions = [...values.dimensions].map((d) => ({
      label: d.label.trim(),
      analysis: (d.analysis ?? "").trim(),
      rating: d.rating,
    }));

    const payload = {
      title: values.title,
      status: values.status,
      rating: values.rating,
      checklist: normalizeChecklistForStorage(values.checklist ?? {}),
      dimensions,
      ai_draft: values.ai_draft,
      final_review: values.final_review,
    };

    if (isEdit && review) {
      const result = await updateReview({
        ...payload,
        id: review.id,
        employeeId,
      });
      if (!result.ok) {
        form.setError("root", { message: result.error });
        return;
      }
    } else {
      const result = await createReview({ ...payload, employeeId });
      if (!result.ok) {
        form.setError("root", { message: result.error });
        return;
      }
    }
    onOpenChange(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[min(94dvh,_880px)] max-w-xl gap-0 overflow-y-auto p-0">
        <form onSubmit={onSubmit}>
          <div className="p-6 pb-2">
            <DialogHeader className="text-left">
              <DialogTitle>
                {isEdit ? "Edit review" : "New performance review"}
              </DialogTitle>
              <DialogDescription>
                Tick the predefined checklist—that becomes the{" "}
                <span className="text-foreground font-medium">official 1–5 score</span>{" "}
                when anything is marked (weighted across criteria). Use performance
                areas for narrative proof. AI-assisted drafting for combining notes,
                achievements, and prior reviews lives only under{" "}
                <span className="text-foreground font-medium">Roll-up from period</span>—
                type everything here yourself, or start a roll-up and edit the result
                back in this dialog.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="border-border grid gap-5 border-y px-6 py-6">
            {form.formState.errors.root?.message ? (
              <p className="text-destructive text-sm" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="rev-title">Review title</Label>
              <Input
                id="rev-title"
                placeholder="Mid-year · Q4 · Annual"
                {...form.register("title")}
              />
              {form.formState.errors.title ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.title.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  form.setValue("dimensions", [...DEFAULT_DIMENSION_ROWS]);
                  form.trigger("dimensions");
                }}
              >
                Load template areas
              </Button>
            </div>

            <div className="border-border/80 bg-muted/15 space-y-3 rounded-xl border p-4">
              <div>
                <Label>Performance checklist</Label>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Check what was true for this review. Each item has a weight; the saved
                  score is the weighted share mapped to{" "}
                  <span className="text-foreground font-medium tabular-nums">1–5</span>
                  .
                </p>
              </div>
              <ul className="space-y-2.5">
                {PERFORMANCE_CHECKLIST.map((item) => (
                  <li key={item.slug}>
                    <Controller
                      name={`checklist.${item.slug}`}
                      control={form.control}
                      render={({ field }) => (
                        <label className="hover:bg-muted/45 flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-sm transition-colors">
                          <input
                            type="checkbox"
                            className="text-primary mt-0.5 size-4 shrink-0 rounded border-input"
                            checked={Boolean(field.value)}
                            onChange={(e) =>
                              field.onChange(e.target.checked)
                            }
                          />
                          <span className="min-w-0">
                            <span className="leading-snug font-medium">
                              {item.label}
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs tabular-nums">
                              Weight {item.weight}/{CHECKLIST_TOTAL_WEIGHT}
                            </span>
                          </span>
                        </label>
                      )}
                    />
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs tabular-nums">
                Criteria met:{" "}
                <span className="text-foreground font-semibold">
                  {checklistStats.earned}/{checklistStats.max}
                </span>{" "}
                ({Math.round(checklistStats.pct * 100)}% coverage)
              </p>
              {checklistOfficial !== null ? (
                <p className="text-foreground border-border/70 bg-background/80 rounded-lg border px-3 py-2 text-sm tabular-nums">
                  Score from checklist:{" "}
                  <span className="font-semibold">{checklistOfficial}/5</span>
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Mark at least one criterion—otherwise scoring falls back to your
                  area averages or manual pick.
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Performance areas</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-0.5"
                  onClick={() =>
                    dimensionsFA.append({
                      label: "",
                      analysis: "",
                      rating: 3,
                    })
                  }
                >
                  <PlusIcon className="size-3.5" />
                  Area
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {checklistOfficial !== null ? (
                  <>
                    Checklist controls the saved score (
                    <span className="text-foreground font-semibold tabular-nums">
                      {checklistOfficial}/5
                    </span>
                    ). Areas are for evidence and discussion—optional but recommended.
                  </>
                ) : watchedDims && watchedDims.length > 0 ? (
                  <>
                    Overall from areas (saved on submit):{" "}
                    <span className="text-foreground font-semibold tabular-nums">
                      {derivedOverall}/5
                    </span>
                    —rounded mean of row ratings.
                  </>
                ) : (
                  <>
                    With no checklist marks, add areas below to derive a score, or
                    enter an optional overall rating manually on the right.
                  </>
                )}
              </p>

              <ul className="space-y-4">
                {dimensionsFA.fields.map((fieldItem, idx) => (
                  <li
                    key={fieldItem.id}
                    className="border-border/80 bg-muted/18 space-y-3 rounded-xl border p-3"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="grid min-w-0 flex-1 gap-2">
                        <Label htmlFor={`rev-dim-${idx}-label`}>
                          Area {idx + 1}
                        </Label>
                        <Input
                          id={`rev-dim-${idx}-label`}
                          {...form.register(`dimensions.${idx}.label`)}
                          placeholder="e.g. Collaboration"
                        />
                      </div>
                      <Controller
                        name={`dimensions.${idx}.rating`}
                        control={form.control}
                        render={({ field }) => (
                          <div className="grid gap-2 sm:w-[7.25rem]">
                            <Label htmlFor={`rev-dim-${idx}-rating`}>
                              Score
                            </Label>
                            <select
                              id={`rev-dim-${idx}-rating`}
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              className={cn(
                                "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full rounded-lg border px-2 text-sm outline-none focus-visible:ring-[3px]",
                              )}
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                  {n} / 5
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground mt-7 shrink-0"
                        aria-label="Remove area"
                        onClick={() => dimensionsFA.remove(idx)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`rev-dim-${idx}-analysis`}>
                        Analysis / evidence
                      </Label>
                      <Textarea
                        id={`rev-dim-${idx}-analysis`}
                        rows={3}
                        {...form.register(`dimensions.${idx}.analysis`)}
                        placeholder="Concrete examples, themes, outcomes…"
                        className="min-h-[80px]"
                      />
                    </div>
                    {form.formState.errors.dimensions?.[idx] ? (
                      <p className="text-destructive text-xs">
                        {[
                          form.formState.errors.dimensions[idx]?.label
                            ?.message,
                          form.formState.errors.dimensions[idx]?.rating
                            ?.message,
                          form.formState.errors.dimensions[idx]?.analysis
                            ?.message,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rev-status">Status</Label>
                <select
                  id="rev-status"
                  {...form.register("status")}
                  className={cn(
                    "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:border-destructive focus-visible:border-ring aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:focus-visible:ring-destructive/40 h-10 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Finalized</option>
                  <option value="archived">Shelved</option>
                </select>
                {form.formState.errors.status ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.status.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                {checklistOfficial !== null ? (
                  <>
                    <Label>Official rating</Label>
                    <p className="text-muted-foreground py-2 text-sm tabular-nums">
                      From checklist weighted score{" "}
                      <span className="text-foreground font-semibold">
                        {checklistOfficial}/5
                      </span>
                      . Clear checklist ticks if you need area-based scoring instead.
                    </p>
                  </>
                ) : watchedDims && watchedDims.length > 0 ? (
                  <>
                    <Label>Overall rating</Label>
                    <p className="text-muted-foreground py-2 text-sm tabular-nums">
                      Set automatically from area scores ({derivedOverall}/5).
                    </p>
                  </>
                ) : (
                  <Controller
                    name="rating"
                    control={form.control}
                    render={({ field }) => (
                      <>
                        <Label htmlFor="rev-rating">Overall (optional)</Label>
                        <select
                          id="rev-rating"
                          {...field}
                          value={
                            field.value === null || field.value === undefined
                              ? ""
                              : String(field.value)
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          className={cn(
                            "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50",
                          )}
                        >
                          <option value="">Not set</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} / 5
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  />
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rev-draft">Working draft</Label>
              <Textarea
                id="rev-draft"
                rows={7}
                className="min-h-[116px]"
                placeholder="Rough notes and themes before you tighten the narrative…"
                {...form.register("ai_draft")}
              />
              <p className="text-muted-foreground text-xs">
                Manager-only notes and bullet scaffolding before you tighten the
                narrative.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rev-final">Final summary</Label>
              <Textarea
                id="rev-final"
                rows={9}
                className="min-h-[148px]"
                placeholder="Formal review wording for HR or their file…"
                {...form.register("final_review")}
              />
              {form.formState.errors.final_review ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.final_review.message}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Required when marking as finalized (minimum 15 characters).
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 pt-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 shrink-0 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save review"
              ) : (
                "Create review"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PublishReviewDialog({
  row,
  employeeId,
  open,
  onOpenChange,
  onPublished,
}: {
  row: ReviewWithDimensions | null;
  employeeId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onPublished: () => void;
}): React.ReactElement {
  const [busy, setBusy] = React.useState(false);
  const finalLen = row?.final_review?.trim().length ?? 0;
  const meetsSummary = finalLen >= 15;
  const dimCount = row?.review_dimensions?.length ?? 0;

  React.useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  const onPublish = async (): Promise<void> => {
    if (!row || !meetsSummary) return;
    setBusy(true);
    try {
      const result = await publishReview({ id: row.id, employeeId });
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onOpenChange(false);
      onPublished();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalize this performance review?</DialogTitle>
          <DialogDescription className="text-pretty leading-relaxed">
            Finalizing locks this review as the official record for dashboards and
            rankings. Notes and achievements stay editable elsewhere; only formal
            reviews use this step.
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="space-y-4 py-2">
            <div className="border-border bg-muted/30 space-y-2 rounded-xl border p-3 text-sm">
              <p className="text-foreground font-medium">
                Before you finalize · {reviewTitle(row)}
              </p>
              <ul className="text-muted-foreground space-y-1.5">
                <li className="flex gap-2">
                  <span className={meetsSummary ? "text-emerald-600" : ""}>
                    {meetsSummary ? "✓" : "○"}
                  </span>
                  <span>
                    Final summary is at least 15 characters
                    {!meetsSummary ? (
                      <span className="text-destructive block text-xs">
                        Currently {finalLen}. Open edit to polish the narrative.
                      </span>
                    ) : null}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className={dimCount > 0 ? "text-emerald-600" : ""}>
                    {dimCount > 0 ? "✓" : "○"}
                  </span>
                  <span>
                    Performance areas documented ({dimCount} area
                    {dimCount !== 1 ? "s" : ""}) — recommended for context alongside
                    the checklist score.
                  </span>
                </li>
              </ul>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              After finalizing, this review counts toward team averages and the
              dashboard strengths / focus lists.
            </p>
          </div>
        ) : null}
        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-1"
            disabled={busy || !meetsSummary}
            onClick={() => void onPublish()}
          >
            {busy ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Finalizing…
              </>
            ) : (
              <>
                <RocketIcon className="size-4" aria-hidden />
                Finalize review
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewsPanel({
  employeeId,
  reviews,
}: {
  employeeId: string;
  reviews: ReviewWithDimensions[];
}): React.ReactElement {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [publishTarget, setPublishTarget] =
    React.useState<ReviewWithDimensions | null>(null);
  const [active, setActive] = React.useState<ReviewWithDimensions | null>(null);

  const openCreate = (): void => {
    setActive(null);
    setEditorOpen(true);
  };

  const openEdit = (row: ReviewWithDimensions): void => {
    setActive(row);
    setEditorOpen(true);
  };

  const onDelete = async (row: ReviewWithDimensions): Promise<void> => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    const result = await deleteReview({ id: row.id, employeeId });
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  };

  const sorted = [...reviews].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold">Reviews</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Standalone performance reviews (checklist + areas). For a period summary
            that pulls in{" "}
            <span className="text-foreground font-medium">
              notes, achievements, and prior reviews
            </span>
            , use{" "}
            <span className="text-foreground font-medium">Roll-up from period</span>.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1"
            render={
              <Link href={`/employees/${employeeId}/generate-review`} />
            }
            nativeButton={false}
          >
            <CalendarRangeIcon className="size-3.5" aria-hidden />
            Roll-up from period
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={openCreate}
          >
            <PlusIcon className="size-3.5" aria-hidden />
            New review
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No reviews yet. Add a checklist-backed review here, or start a roll-up from
          the employee profile to combine notes, achievements, and prior reviews for
          a date range.
        </p>
      ) : (
        <ScrollArea className="max-h-[460px] pr-3">
          <ul className="space-y-4">
            {sorted.map((row) => {
              const sb = statusBadge(row.status);
              const dimCount = row.review_dimensions?.length ?? 0;
              const preview =
                row.final_review?.trim() ??
                row.ai_draft?.trim() ??
                "No content saved yet.";
              return (
                <li key={row.id}>
                  <div className="border-border/70 bg-card/40 hover:border-primary/14 rounded-2xl border p-4 shadow-[0_1px_2px_-1px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-heading truncate leading-tight font-medium">
                          {reviewTitle(row)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant={sb.variant} className="font-normal">
                            {sb.label}
                          </Badge>
                          {dimCount > 0 ? (
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {dimCount} areas
                              {typeof row.rating === "number"
                                ? ` · ${row.rating}/5 (from areas)`
                                : ""}
                            </span>
                          ) : typeof row.rating === "number" ? (
                            <span className="text-muted-foreground text-xs tabular-nums">
                              Rating {row.rating}/5
                            </span>
                          ) : null}
                          <span className="text-muted-foreground text-xs">
                            Started{" "}
                            {new Date(row.created_at).toLocaleDateString(
                              undefined,
                              { dateStyle: "medium" },
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {row.status === "draft" ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="hover:bg-secondary/70 text-primary"
                            aria-label="Finalize review"
                            title="Finalize review"
                            onClick={() => setPublishTarget(row)}
                          >
                            <RocketIcon className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit review"
                          onClick={() => openEdit(row)}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Delete review"
                          onClick={() => void onDelete(row)}
                        >
                          <Trash2Icon className="text-destructive size-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-3 line-clamp-4 text-sm leading-relaxed">
                      {preview}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}

      <ReviewFormDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        employeeId={employeeId}
        review={active}
      />
      <PublishReviewDialog
        row={publishTarget}
        employeeId={employeeId}
        open={publishTarget !== null}
        onOpenChange={(next) => {
          if (!next) setPublishTarget(null);
        }}
        onPublished={() => {
          setPublishTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
