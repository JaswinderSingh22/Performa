"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2Icon, Loader2Icon, SparklesIcon, StarIcon } from "lucide-react";
import { z } from "zod";
import { motion } from "motion/react";

import { submitSelfReview } from "@/actions/review-cycles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EmployeeRow, EmployeeSelfReviewRow, ReviewCycleRow } from "@/types/database";

const schema = z.object({
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
});

type FormValues = z.input<typeof schema>;

const FORM_QUESTIONS = [
  {
    key: "highlights" as const,
    label: "What went well this period?",
    sublabel: "Share your key wins, successful projects, or moments you're proud of.",
    emoji: "✅",
    placeholder: "e.g. Successfully delivered the new onboarding flow on time, helped unblock the team on the API migration…",
    required: true,
  },
  {
    key: "challenges" as const,
    label: "What was challenging or blocked you?",
    sublabel: "Honest reflection helps your manager understand what support you need.",
    emoji: "⚡",
    placeholder: "e.g. Had difficulty with unclear requirements on project X, struggled to balance multiple priorities…",
    required: false,
  },
  {
    key: "goals_next_period" as const,
    label: "What are your goals for the next period?",
    sublabel: "Be specific. Think about deliverables, skills, and team contributions.",
    emoji: "🎯",
    placeholder: "e.g. Complete certification in Y, improve code review turnaround, lead the Z feature end-to-end…",
    required: false,
  },
  {
    key: "collaboration_note" as const,
    label: "How was collaboration with the team?",
    sublabel: "Reflect on your teamwork, communication, and cross-functional interactions.",
    emoji: "🤝",
    placeholder: "e.g. Great coordination with design on the new dashboard, could have communicated blockers earlier…",
    required: false,
  },
  {
    key: "growth_areas" as const,
    label: "What areas do you want to grow in?",
    sublabel: "Skills, behaviours, or responsibilities you'd like to develop.",
    emoji: "🌱",
    placeholder: "e.g. System design, public speaking, taking ownership of larger features…",
    required: false,
  },
  {
    key: "support_needed" as const,
    label: "Do you need any support or resources?",
    sublabel: "Anything your manager or the company can do to help you succeed.",
    emoji: "🙋",
    placeholder: "e.g. Mentoring on architecture decisions, clearer sprint goals, more 1:1 time…",
    required: false,
  },
] as const;

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
            className="flex flex-col items-center gap-1 transition-all hover:scale-110 group"
          >
            <StarIcon
              className={cn(
                "size-8 transition-all",
                (hovered ?? value ?? 0) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/30 group-hover:text-amber-300",
              )}
            />
            <span className="text-[10px] text-muted-foreground">{n}</span>
          </button>
        ))}
      </div>
      {(hovered ?? value) && (
        <p className="text-sm text-muted-foreground">
          {labels[(hovered ?? value ?? 1) - 1]}
        </p>
      )}
    </div>
  );
}

export function SelfReviewFormClient({
  token,
  selfReview,
  cycle,
  employee,
}: {
  token: string;
  selfReview: EmployeeSelfReviewRow;
  cycle: ReviewCycleRow;
  employee: EmployeeRow;
}) {
  const [submitted, setSubmitted] = React.useState(
    selfReview.status === "submitted",
  );
  const [activeStep, setActiveStep] = React.useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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

  const totalQuestions = FORM_QUESTIONS.length + 1; // +1 for self-rating

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
            Your self-review for <strong>{cycle.title}</strong> has been submitted. Your manager will review and share feedback soon.
          </p>
          <p className="text-muted-foreground mt-6 text-sm">
            You can close this tab.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/60 bg-card px-6 py-4">
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
                style={{ width: `${(activeStep / totalQuestions) * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs">
              {activeStep}/{totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="mx-auto max-w-2xl px-6 py-10">
        {/* Intro */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold">Self-review</h1>
          <p className="text-muted-foreground mt-2">
            Take a moment to reflect on your work this period. Your responses will be shared with your manager and are used to write your performance review.
          </p>
          {cycle.self_review_due && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">
              <SparklesIcon className="size-3" />
              Due by{" "}
              {new Date(cycle.self_review_due).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {FORM_QUESTIONS.map((q, idx) => (
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
                    {q.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {q.sublabel}
                  </p>
                </div>
              </div>
              <Textarea
                {...form.register(q.key)}
                placeholder={q.placeholder}
                rows={4}
                className="resize-none text-sm"
              />
              {form.formState.errors[q.key] && (
                <p className="text-destructive text-xs">
                  {form.formState.errors[q.key]?.message}
                </p>
              )}
            </motion.div>
          ))}

          {/* Self-rating */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: FORM_QUESTIONS.length * 0.05 }}
            className="rounded-2xl border border-border/65 bg-card p-6 space-y-3"
            onFocus={() => setActiveStep(totalQuestions)}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-xl">⭐</span>
              <div>
                <Label className="text-base font-semibold">
                  How would you rate your overall performance?
                </Label>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  A honest self-assessment helps calibrate the final review.
                </p>
              </div>
            </div>
            <SelfRatingInput
              value={selfRating}
              onChange={(v) => form.setValue("self_rating", v)}
            />
          </motion.div>

          {/* Error */}
          {form.formState.errors.root && (
            <div className="text-destructive rounded-xl bg-destructive/10 px-4 py-3 text-sm">
              {form.formState.errors.root.message}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              size="lg"
              className="min-w-[160px] gap-2"
              disabled={form.formState.isSubmitting}
            >
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
