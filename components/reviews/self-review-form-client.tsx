"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { CheckCircle2Icon, Loader2Icon, SparklesIcon, StarIcon } from "lucide-react";
import { z } from "zod";
import { motion } from "motion/react";

import { submitSelfReview } from "@/actions/review-cycles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SelfReviewSectionKey } from "@/lib/reviews/review-template-definition";
import {
  definitionToSelfReviewQuestions,
  type ReviewSelfTemplateDefinition,
} from "@/lib/reviews/review-template-definition";
import type { EmployeeRow, EmployeeSelfReviewRow, ReviewCycleRow } from "@/types/database";

function buildSelfReviewSchema(definition: ReviewSelfTemplateDefinition) {
  const questions = definitionToSelfReviewQuestions(definition);
  const showRating = definition.show_self_rating !== false;

  const baseShape = {
    highlights: z.string().max(4000, "Max 4000 characters").default(""),
    challenges: z.string().max(4000, "Max 4000 characters").default(""),
    goals_next_period: z.string().max(4000, "Max 4000 characters").default(""),
    collaboration_note: z.string().max(4000, "Max 4000 characters").default(""),
    growth_areas: z.string().max(4000, "Max 4000 characters").default(""),
    support_needed: z.string().max(2000, "Max 2000 characters").default(""),
    self_rating: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.union([z.null(), z.number().int().min(1).max(5)]),
    ),
  };

  return z.object(baseShape).superRefine((data, ctx) => {
    const fieldMap = data as Record<SelfReviewSectionKey, string>;
    for (const q of questions) {
      if (!q.required) continue;
      if (!(fieldMap[q.key] ?? "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: [q.key],
        });
      }
    }
    if (showRating && (data.self_rating === null || data.self_rating === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please choose a rating",
        path: ["self_rating"],
      });
    }
  });
}

type FormValues = {
  highlights: string;
  challenges: string;
  goals_next_period: string;
  collaboration_note: string;
  growth_areas: string;
  support_needed: string;
  self_rating: number | null;
};

function SelfRatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const labels = ["Below expectations", "Needs improvement", "Met expectations", "Exceeded", "Outstanding"];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            className="group flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <StarIcon
              className={cn(
                "size-8 transition-all",
                (hovered ?? value ?? 0) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/30 group-hover:text-amber-300",
              )}
            />
            <span className="text-muted-foreground text-[10px]">{n}</span>
          </button>
        ))}
      </div>
      {(hovered ?? value) ? (
        <p className="text-muted-foreground text-sm">
          {labels[(hovered ?? value ?? 1) - 1]}
        </p>
      ) : null}
    </div>
  );
}

export function SelfReviewFormClient({
  token,
  selfReview,
  cycle,
  employee,
  definition,
}: {
  token: string;
  selfReview: EmployeeSelfReviewRow;
  cycle: ReviewCycleRow;
  employee: EmployeeRow;
  definition: ReviewSelfTemplateDefinition;
}) {
  const [submitted, setSubmitted] = React.useState(selfReview.status === "submitted");
  const [activeStep, setActiveStep] = React.useState(0);

  const questions = React.useMemo(
    () => definitionToSelfReviewQuestions(definition),
    [definition],
  );
  const showSelfRating = definition.show_self_rating !== false;
  const schema = React.useMemo(() => buildSelfReviewSchema(definition), [definition]);

  const totalSteps = React.useMemo(
    () => questions.length + (showSelfRating ? 1 : 0),
    [questions.length, showSelfRating],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      highlights: selfReview.highlights ?? "",
      challenges: selfReview.challenges ?? "",
      goals_next_period: selfReview.goals_next_period ?? "",
      collaboration_note: selfReview.collaboration_note ?? "",
      growth_areas: selfReview.growth_areas ?? "",
      support_needed: selfReview.support_needed ?? "",
      self_rating: selfReview.self_rating ?? null,
    },
  });

  const selfRating = form.watch("self_rating") as number | null;

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await submitSelfReview({ token, ...values });
    if (!res.ok) {
      form.setError("root", {
        message: (res as { ok: false; error: string }).error,
      });
      return;
    }
    setSubmitted(true);
  });

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-background p-6 dark:from-emerald-950/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-500/15"
          >
            <CheckCircle2Icon className="size-10 text-emerald-500" />
          </motion.div>
          <h1 className="text-2xl font-bold">You&apos;re done! 🎉</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Your self-review for <strong>{cycle.title}</strong> has been submitted. Your manager will
            review and share feedback soon.
          </p>
          <p className="text-muted-foreground mt-6 text-sm">You can close this tab.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-border/60 bg-card border-b px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{employee.name}</p>
              <p className="text-muted-foreground text-xs">{cycle.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-muted/60 h-2 w-24 overflow-hidden rounded-full sm:w-40">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{
                  width: `${totalSteps > 0 ? (activeStep / totalSteps) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-muted-foreground text-xs">
              {activeStep}/{totalSteps}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-bold">Self-review</h1>
          <p className="text-muted-foreground mt-2">
            Take a moment to reflect on your work this period. Your responses will be shared with your
            manager and are used to write your performance review.
          </p>
          {cycle.self_review_due ? (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">
              <SparklesIcon className="size-3" />
              Due by{" "}
              {new Date(cycle.self_review_due).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          {questions.map((q, idx) => (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="space-y-2"
              onFocus={() => setActiveStep(idx + 1)}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-xl">{q.emoji}</span>
                <div>
                  <Label className="text-base font-semibold">
                    {q.label}
                    {q.required ? (
                      <span className="text-destructive ml-1">*</span>
                    ) : null}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-sm">{q.sublabel}</p>
                </div>
              </div>
              <Textarea
                {...form.register(q.key)}
                placeholder={q.placeholder}
                rows={4}
                className="resize-none text-sm"
              />
              {form.formState.errors[q.key] ? (
                <p className="text-destructive text-xs">{form.formState.errors[q.key]?.message}</p>
              ) : null}
            </motion.div>
          ))}

          {showSelfRating ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: questions.length * 0.05 }}
              className="border-border/65 bg-card space-y-3 rounded-2xl border p-6"
              onFocus={() => setActiveStep(totalSteps)}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl">⭐</span>
                <div>
                  <Label className="text-base font-semibold">
                    {definition.self_rating_title ?? "How would you rate your overall performance?"}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {definition.self_rating_description ??
                      "A honest self-assessment helps calibrate the final review."}
                  </p>
                </div>
              </div>
              <SelfRatingInput
                value={selfRating}
                onChange={(v) => form.setValue("self_rating", v)}
              />
              {form.formState.errors.self_rating ? (
                <p className="text-destructive text-xs">{form.formState.errors.self_rating.message}</p>
              ) : null}
            </motion.div>
          ) : null}

          {form.formState.errors.root ? (
            <div className="text-destructive rounded-xl bg-destructive/10 px-4 py-3 text-sm">
              {form.formState.errors.root.message}
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" className="min-w-[160px] gap-2" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>Submit review ✓</>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
