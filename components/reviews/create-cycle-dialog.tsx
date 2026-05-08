"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CalendarRangeIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { z } from "zod";

import { createReviewCycle } from "@/actions/review-cycles";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/plans";
import { listPresetOptionsForPlan } from "@/lib/reviews/preset-review-templates";
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

export type CreateCycleTeamOption = { name: string };
export type CreateCycleDepartmentOption = { id: string; name: string };

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    cadence: z.enum(["monthly", "quarterly", "mid_year", "yearly"]),
    period_start: z.string().min(1, "Required"),
    period_end: z.string().min(1, "Required"),
    self_review_due: z.string().optional(),
    scope_entire_org: z.boolean(),
    scoped_team_names: z.array(z.string()).default([]),
    scoped_department_ids: z.array(z.string().uuid()).default([]),
    review_template_preset: z.enum([
      "general",
      "engineering",
      "sales",
      "customer_success",
      "leadership",
    ]),
  })
  .superRefine((data, ctx) => {
    if (!data.scope_entire_org) {
      const teams = data.scoped_team_names?.length ?? 0;
      const depts = data.scoped_department_ids?.length ?? 0;
      if (teams === 0 && depts === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Select at least one team or department when scoping manually, or include the entire workspace.",
          path: ["scoped_team_names"],
        });
      }
    }
  });

type FormValues = z.input<typeof schema>;

const CADENCE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  mid_year: "Mid-year",
  yearly: "Yearly",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function quarterEnd(start: string): string {
  const d = new Date(start);
  d.setMonth(d.getMonth() + 3);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function CreateCycleDialog({
  teams,
  departments,
  workspacePlan,
}: {
  teams: CreateCycleTeamOption[];
  departments: CreateCycleDepartmentOption[];
  workspacePlan: PlanId;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const hasTeams = teams.length > 0;
  const hasDepartments = departments.length > 0;
  /** No way to carve a subgroup until at least one team or department exists. */
  const mustScopeWholeWorkspace = !hasTeams && !hasDepartments;

  const presetOptions = React.useMemo(
    () => listPresetOptionsForPlan(workspacePlan),
    [workspacePlan],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      cadence: "quarterly",
      period_start: todayStr(),
      period_end: quarterEnd(todayStr()),
      self_review_due: "",
      scope_entire_org: mustScopeWholeWorkspace,
      scoped_team_names: [],
      scoped_department_ids: [],
      review_template_preset: "general",
    },
  });

  const resetForm = React.useCallback(() => {
    form.reset({
      title: "",
      cadence: "quarterly",
      period_start: todayStr(),
      period_end: quarterEnd(todayStr()),
      self_review_due: "",
      scope_entire_org: mustScopeWholeWorkspace,
      scoped_team_names: [],
      scoped_department_ids: [],
      review_template_preset: "general",
    });
  }, [form, mustScopeWholeWorkspace]);

  React.useEffect(() => {
    if (!open) return;
    form.setValue("scope_entire_org", mustScopeWholeWorkspace);
    form.setValue("scoped_team_names", []);
    form.setValue("scoped_department_ids", []);
    const allowed = presetOptions.map((p) => p.id);
    const curPreset = form.getValues("review_template_preset");
    if (!allowed.includes(curPreset)) {
      form.setValue("review_template_preset", "general");
    }
  }, [open, mustScopeWholeWorkspace, form, presetOptions]);

  const onSubmit = form.handleSubmit(async (values) => {
    const scopeWhole = mustScopeWholeWorkspace ? true : values.scope_entire_org;
    const result = await createReviewCycle({
      ...values,
      self_review_due: values.self_review_due?.trim() || undefined,
      scope_entire_org: scopeWhole,
      scoped_team_names: scopeWhole ? [] : values.scoped_team_names,
      scoped_department_ids: scopeWhole ? [] : values.scoped_department_ids,
      review_template_preset: values.review_template_preset,
    });
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  });

  const [cadence, periodStart] = form.watch(["cadence", "period_start"]);
  React.useEffect(() => {
    if (!periodStart) return;
    const d = new Date(periodStart);
    if (isNaN(d.getTime())) return;
    const year = d.getFullYear();
    const month = d.toLocaleString("default", { month: "long" });
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    const labels: Record<string, string> = {
      monthly: `${month} ${year} Review`,
      quarterly: `Q${quarter} ${year} Review`,
      mid_year: `Mid-Year ${year} Review`,
      yearly: `Annual ${year} Review`,
    };
    form.setValue("title", labels[cadence] ?? `${year} Review`);
    if (cadence === "quarterly") {
      form.setValue("period_end", quarterEnd(periodStart));
    }
  }, [cadence, periodStart, form]);

  const scopeLimited = mustScopeWholeWorkspace ? false : form.watch("scope_entire_org") === false;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <PlusIcon className="size-4" />
        New review cycle
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(92dvh,calc(100vh-2rem))] flex-col gap-4 overflow-hidden p-4 sm:max-w-lg">
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 max-h-[inherit] flex-1 flex-col gap-4"
          >
            <DialogHeader className="shrink-0 space-y-0 pb-0 pr-8">
              <div className="bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-xl">
                <CalendarRangeIcon className="size-5" />
              </div>
              <DialogTitle>New review cycle</DialogTitle>
              <DialogDescription>
                Pick a self-review questionnaire, who is included when the cycle opens (entire workspace
                or selected teams and directory departments), dates, and cadence.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 pb-2">
              <div className="flex flex-col gap-4 pb-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cc-title">Cycle title</Label>
                <Input id="cc-title" {...form.register("title")} placeholder="Q1 2026 Review" />
                {form.formState.errors.title && (
                  <p className="text-destructive text-xs">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cc-cadence">Cadence</Label>
                <select
                  id="cc-cadence"
                  className="border-input bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm"
                  {...form.register("cadence")}
                >
                  {Object.entries(CADENCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cc-start">Period start</Label>
                  <Input id="cc-start" type="date" {...form.register("period_start")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cc-end">Period end</Label>
                  <Input id="cc-end" type="date" {...form.register("period_end")} />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cc-due">
                  Self-review deadline{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input id="cc-due" type="date" {...form.register("self_review_due")} />
                <p className="text-muted-foreground text-xs">
                  Employees will be reminded to submit by this date.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cc-template">Self-review questionnaire</Label>
                <select
                  id="cc-template"
                  className="border-input bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm"
                  {...form.register("review_template_preset")}
                >
                  {presetOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {presetOptions.find((p) => p.id === form.watch("review_template_preset"))
                    ?.description ?? ""}
                </p>
              </div>

              <div className="border-border/60 bg-muted/20 grid gap-2 rounded-xl border p-3">
                <p className="text-sm font-medium">Who is included?</p>
                {mustScopeWholeWorkspace ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Add at least one team or directory department to scope a subset. Until then, this
                    cycle will include <strong>all active employees</strong> when opened.
                  </p>
                ) : (
                  <>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        className="mt-0.5"
                        checked={form.watch("scope_entire_org")}
                        onChange={() => {
                          form.setValue("scope_entire_org", true);
                          form.setValue("scoped_team_names", []);
                          form.setValue("scoped_department_ids", []);
                          form.clearErrors("scoped_team_names");
                        }}
                      />
                      <span>
                        <span className="font-medium">Entire workspace</span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          All active employees when the cycle is opened.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        className="mt-0.5"
                        checked={!form.watch("scope_entire_org")}
                        onChange={() => {
                          form.setValue("scope_entire_org", false);
                        }}
                      />
                      <span className="flex-1">
                        <span className="font-medium">Selected teams and/or departments</span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          Union of everyone who matches a chosen team name or directory department.
                        </span>
                        {scopeLimited && (
                          <div className="mt-3 space-y-3">
                            {hasTeams && (
                              <div className="grid gap-1.5">
                                <p className="text-muted-foreground text-xs font-medium">Teams</p>
                                <div className="grid gap-2 pr-1">
                                  {teams.map((t) => {
                                    const selected = (form.watch("scoped_team_names") ?? []).includes(
                                      t.name,
                                    );
                                    return (
                                      <label
                                        key={t.name}
                                        className="border-border/60 flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={(e) => {
                                            const cur = form.getValues("scoped_team_names") ?? [];
                                            if (e.target.checked) {
                                              form.setValue("scoped_team_names", [...cur, t.name], {
                                                shouldValidate: true,
                                              });
                                            } else {
                                              form.setValue(
                                                "scoped_team_names",
                                                cur.filter((n) => n !== t.name),
                                                { shouldValidate: true },
                                              );
                                            }
                                          }}
                                        />
                                        <span className="font-medium">{t.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {hasDepartments && (
                              <div className="grid gap-1.5">
                                <p className="text-muted-foreground text-xs font-medium">
                                  Directory departments
                                </p>
                                <div className="grid gap-2 pr-1">
                                  {departments.map((d) => {
                                    const selected = (form.watch("scoped_department_ids") ?? []).includes(
                                      d.id,
                                    );
                                    return (
                                      <label
                                        key={d.id}
                                        className="border-border/60 flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={(e) => {
                                            const cur = form.getValues("scoped_department_ids") ?? [];
                                            if (e.target.checked) {
                                              form.setValue(
                                                "scoped_department_ids",
                                                [...cur, d.id],
                                                { shouldValidate: true },
                                              );
                                            } else {
                                              form.setValue(
                                                "scoped_department_ids",
                                                cur.filter((id) => id !== d.id),
                                                { shouldValidate: true },
                                              );
                                            }
                                          }}
                                        />
                                        <span className="font-medium">{d.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </span>
                    </label>
                  </>
                )}
                {form.formState.errors.scoped_team_names && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.scoped_team_names.message}
                  </p>
                )}
              </div>

              {form.formState.errors.root && (
                <p className="text-destructive rounded-lg bg-destructive/10 px-3 py-2 text-sm">
                  {form.formState.errors.root.message}
                </p>
              )}
              </div>
            </div>

            <DialogFooter className="mt-0 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create cycle"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
