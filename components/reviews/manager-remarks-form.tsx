"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  SparklesIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { z } from "zod";

import { approveManagerRemarks, saveManagerRemarks } from "@/actions/review-cycles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  EmployeeRow,
  EmployeeSelfReviewRow,
  ReviewCycleRow,
  ReviewManagerRemarksRow,
} from "@/types/database";

const schema = z.object({
  highlights_remark: z.string().max(4000).default(""),
  challenges_remark: z.string().max(4000).default(""),
  goals_remark: z.string().max(4000).default(""),
  growth_remark: z.string().max(4000).default(""),
  final_remark: z.string().max(8000).default(""),
  overall_rating: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.union([z.null(), z.number().int().min(1).max(5)]),
  ),
});

type FormValues = z.input<typeof schema>;

const REVIEW_SECTIONS = [
  {
    key: "highlights" as const,
    label: "Highlights",
    employeeField: "highlights",
    remarkField: "highlights_remark" as keyof FormValues,
    icon: "✅",
    description: "What went well this period",
  },
  {
    key: "challenges" as const,
    label: "Challenges",
    employeeField: "challenges",
    remarkField: "challenges_remark" as keyof FormValues,
    icon: "⚡",
    description: "What was hard or blocked them",
  },
  {
    key: "goals" as const,
    label: "Goals for next period",
    employeeField: "goals_next_period",
    remarkField: "goals_remark" as keyof FormValues,
    icon: "🎯",
    description: "Plans and priorities ahead",
  },
  {
    key: "growth" as const,
    label: "Growth & development",
    employeeField: "growth_areas",
    remarkField: "growth_remark" as keyof FormValues,
    icon: "🌱",
    description: "Skills and areas to grow",
  },
] as const;

function StarRating({
  value,
  onChange,
  readonly,
}: {
  value: number | null;
  onChange: (v: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(n)}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(null)}
          className={cn(
            "transition-all",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
          )}
        >
          <StarIcon
            className={cn(
              "size-5",
              (hovered ?? value ?? 0) >= n
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-muted-foreground/40",
            )}
          />
        </button>
      ))}
      {value && (
        <span className="text-muted-foreground ml-2 text-sm">
          {value}/5
        </span>
      )}
    </div>
  );
}

function SelfReviewSection({
  section,
  selfReview,
  value,
  onChange,
  readonly,
}: {
  section: (typeof REVIEW_SECTIONS)[number];
  selfReview: EmployeeSelfReviewRow;
  value: string;
  onChange: (v: string) => void;
  readonly: boolean;
}) {
  const employeeAnswer =
    (selfReview[section.employeeField as keyof EmployeeSelfReviewRow] as string) ?? "";
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="rounded-2xl border border-border/65 bg-card overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-lg">{section.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{section.label}</p>
          <p className="text-muted-foreground text-xs">{section.description}</p>
        </div>
        {expanded ? (
          <ChevronUpIcon className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronDownIcon className="text-muted-foreground size-4 shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-0 border-t border-border/40 lg:grid-cols-2">
              {/* Employee's answer */}
              <div className="border-b border-border/40 px-5 py-4 lg:border-b-0 lg:border-r">
                <div className="mb-2 flex items-center gap-1.5">
                  <UserIcon className="text-muted-foreground size-3.5" />
                  <span className="text-muted-foreground text-xs font-medium">
                    Employee&apos;s response
                  </span>
                </div>
                {employeeAnswer.trim() ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {employeeAnswer}
                  </p>
                ) : (
                  <p className="text-muted-foreground/60 text-sm italic">
                    No response provided
                  </p>
                )}
              </div>

              {/* Manager remark */}
              <div className="px-5 py-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <SparklesIcon className="text-primary size-3.5" />
                  <span className="text-xs font-medium text-primary">
                    Your remark
                  </span>
                </div>
                <Textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={
                    readonly
                      ? "No remark added."
                      : `Add your feedback on ${section.label.toLowerCase()}…`
                  }
                  readOnly={readonly}
                  rows={4}
                  className={cn(
                    "resize-none text-sm",
                    readonly && "cursor-default opacity-80",
                  )}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ManagerRemarksForm({
  cycle,
  employee,
  selfReview,
  existingRemarks,
  canReview,
  canApprove,
}: {
  cycle: ReviewCycleRow;
  employee: EmployeeRow;
  selfReview: EmployeeSelfReviewRow | null;
  existingRemarks: ReviewManagerRemarksRow | null;
  canReview: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const isApproved = existingRemarks?.status === "approved";
  const readonly = !canReview || isApproved;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      highlights_remark: existingRemarks?.highlights_remark ?? "",
      challenges_remark: existingRemarks?.challenges_remark ?? "",
      goals_remark: existingRemarks?.goals_remark ?? "",
      growth_remark: existingRemarks?.growth_remark ?? "",
      final_remark: existingRemarks?.final_remark ?? "",
      overall_rating: existingRemarks?.overall_rating ?? null,
    },
  });

  const [aiLoading, setAiLoading] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saved" | "error">("idle");
  const [approveLoading, setApproveLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [remarksId, setRemarksId] = React.useState<string | null>(
    existingRemarks?.id ?? null,
  );

  async function handleSave(isDraft = true) {
    if (!selfReview) return;
    setErrorMsg(null);
    const values = form.getValues();
    const res = await saveManagerRemarks({
      selfReviewId: selfReview.id,
      ...values,
    });
    if (!res.ok) {
      setErrorMsg((res as { ok: false; error: string }).error);
      setSaveState("error");
    } else {
      setSaveState("saved");
      if (res.data?.id) setRemarksId(res.data.id);
      if (!isDraft) router.refresh();
      setTimeout(() => setSaveState("idle"), 2500);
    }
  }

  async function handleApprove() {
    if (!remarksId) return;
    setApproveLoading(true);
    setErrorMsg(null);
    const res = await approveManagerRemarks({ remarksId });
    setApproveLoading(false);
    if (!res.ok) {
      setErrorMsg((res as { ok: false; error: string }).error);
    } else {
      router.refresh();
    }
  }

  async function handleAISuggest() {
    if (!selfReview) return;
    setAiLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        employeeName: employee.name,
        role: employee.role ?? "employee",
        cycleName: cycle.title,
        highlights: selfReview.highlights,
        challenges: selfReview.challenges,
        goalsNextPeriod: selfReview.goals_next_period,
        collaborationNote: selfReview.collaboration_note,
        growthAreas: selfReview.growth_areas,
        supportNeeded: selfReview.support_needed,
        selfRating: selfReview.self_rating,
      };
      const res = await fetch("/api/reviews/suggest-remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "AI request failed");
      }
      const suggestions = await res.json();
      form.setValue("highlights_remark", suggestions.highlights_remark ?? "");
      form.setValue("challenges_remark", suggestions.challenges_remark ?? "");
      form.setValue("goals_remark", suggestions.goals_remark ?? "");
      form.setValue("growth_remark", suggestions.growth_remark ?? "");
      form.setValue("final_remark", suggestions.final_remark ?? "");
      form.setValue("overall_rating", suggestions.overall_rating ?? null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "AI error. Try again.");
    } finally {
      setAiLoading(false);
    }
  }

  const overallRating = form.watch("overall_rating") as number | null;

  if (!selfReview) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/10 py-20 text-center">
        <p className="text-muted-foreground">
          This employee has not been included in the cycle yet.
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Open the cycle to generate self-review forms.
        </p>
      </div>
    );
  }

  if (selfReview.status !== "submitted" && !existingRemarks) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/10 py-20 text-center">
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4 flex size-12 items-center justify-center rounded-xl">
          <Loader2Icon className="size-6" />
        </div>
        <p className="font-medium">Waiting for employee submission</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {employee.name} hasn&apos;t submitted their self-review yet.
        </p>
        {selfReview.form_token && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-xs">
              Share this link with them:
            </p>
            <code className="bg-muted/60 rounded-lg px-3 py-1.5 text-xs break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/review-form/${selfReview.form_token}`
                : `/review-form/${selfReview.form_token}`}
            </code>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Employee + cycle info header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl text-xl font-bold">
          {employee.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">{employee.name}</h2>
          <p className="text-muted-foreground text-sm">
            {employee.role || "—"} · {employee.department || "—"}
            {employee.team_name ? ` · ${employee.team_name}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {cycle.title}
            </Badge>
            {isApproved && (
              <Badge className="gap-1.5 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border text-xs">
                <CheckCircle2Icon className="size-3" />
                Approved
              </Badge>
            )}
            {selfReview.self_rating && (
              <Badge variant="outline" className="gap-1 text-xs">
                <StarIcon className="size-3 fill-amber-400 text-amber-400" />
                Self-rated {selfReview.self_rating}/5
              </Badge>
            )}
          </div>
        </div>

        {/* AI button */}
        {!readonly && selfReview.status === "submitted" && (
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-primary/30 hover:bg-primary/5 text-primary"
            onClick={handleAISuggest}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            {aiLoading ? "Generating…" : "AI suggest remarks"}
          </Button>
        )}
      </div>

      {/* Self-review sections */}
      <div className="space-y-3">
        {REVIEW_SECTIONS.map((section) => (
          <SelfReviewSection
            key={section.key}
            section={section}
            selfReview={selfReview}
            value={(form.watch(section.remarkField) as string) ?? ""}
            onChange={(v) => form.setValue(section.remarkField, v)}
            readonly={readonly}
          />
        ))}
      </div>

      {/* Collaboration note (view only) */}
      {selfReview.collaboration_note?.trim() && (
        <div className="rounded-2xl border border-border/65 bg-card px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🤝</span>
            <p className="text-sm font-semibold">Collaboration note</p>
            <span className="text-muted-foreground text-xs">(Employee view only)</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {selfReview.collaboration_note}
          </p>
        </div>
      )}

      {/* Support needed (view only) */}
      {selfReview.support_needed?.trim() && (
        <div className="rounded-2xl border border-border/65 bg-card px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🙋</span>
            <p className="text-sm font-semibold">Support needed</p>
            <span className="text-muted-foreground text-xs">(Employee view only)</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {selfReview.support_needed}
          </p>
        </div>
      )}

      {/* Final summary + overall rating */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
        <div className="border-b border-primary/15 bg-primary/8 px-5 py-4">
          <p className="font-semibold">Overall assessment</p>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your final summary and rating for this review period
          </p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Overall rating</Label>
            <StarRating
              value={overallRating}
              onChange={(v) => form.setValue("overall_rating", v)}
              readonly={readonly}
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">Final remark</Label>
            <Textarea
              {...form.register("final_remark")}
              placeholder={
                readonly
                  ? "No final remark added."
                  : "Write your overall assessment of this employee's performance…"
              }
              readOnly={readonly}
              rows={5}
              className={cn("text-sm resize-none", readonly && "cursor-default opacity-80")}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="text-destructive rounded-xl bg-destructive/10 px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Action bar */}
      {!readonly && (
        <div className="flex items-center justify-between rounded-2xl border border-border/65 bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {saveState === "saved" && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2Icon className="size-4" />
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={form.formState.isSubmitting}
            >
              Save draft
            </Button>
            {canApprove && remarksId && (
              <Button
                type="button"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleApprove}
                disabled={approveLoading}
              >
                {approveLoading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="size-4" />
                )}
                Approve review
              </Button>
            )}
            {!canApprove && (
              <Button
                type="button"
                onClick={() => handleSave(false)}
                disabled={form.formState.isSubmitting}
              >
                Save remarks
              </Button>
            )}
          </div>
        </div>
      )}

      {isApproved && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
          <CheckCircle2Icon className="text-emerald-500 size-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Review approved</p>
            <p className="text-muted-foreground text-xs">
              Approved on{" "}
              {existingRemarks?.approved_at
                ? new Date(existingRemarks.approved_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
