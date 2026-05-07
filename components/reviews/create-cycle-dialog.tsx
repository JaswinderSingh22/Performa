"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CalendarRangeIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { z } from "zod";

import { createReviewCycle } from "@/actions/review-cycles";
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

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    cadence: z.enum(["monthly", "quarterly", "mid_year", "yearly"]),
    period_start: z.string().min(1, "Required"),
    period_end: z.string().min(1, "Required"),
    self_review_due: z.string().optional(),
    scope_entire_org: z.boolean(),
    scoped_team_names: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.scope_entire_org) {
      if (!data.scoped_team_names?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select at least one team or choose entire workspace.",
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

export type CreateCycleTeamOption = { name: string };

export function CreateCycleDialog({ teams }: { teams: CreateCycleTeamOption[] }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const hasTeams = teams.length > 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      cadence: "quarterly",
      period_start: todayStr(),
      period_end: quarterEnd(todayStr()),
      self_review_due: "",
      scope_entire_org: !hasTeams,
      scoped_team_names: [],
    },
  });

  const resetForm = React.useCallback(() => {
    form.reset({
      title: "",
      cadence: "quarterly",
      period_start: todayStr(),
      period_end: quarterEnd(todayStr()),
      self_review_due: "",
      scope_entire_org: !hasTeams,
      scoped_team_names: [],
    });
  }, [form, hasTeams]);

  React.useEffect(() => {
    if (!open) return;
    form.setValue("scope_entire_org", !hasTeams);
    form.setValue("scoped_team_names", []);
  }, [open, hasTeams, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await createReviewCycle({
      ...values,
      self_review_due: values.self_review_due?.trim() || undefined,
      scope_entire_org: !hasTeams ? true : values.scope_entire_org,
      scoped_team_names:
        values.scope_entire_org || !hasTeams ? [] : values.scoped_team_names,
    });
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  });

  // Auto-update title when cadence/start changes
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

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <PlusIcon className="size-4" />
        New review cycle
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={onSubmit} className="flex flex-col gap-0">
            <DialogHeader className="pb-4">
              <div className="bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-xl">
                <CalendarRangeIcon className="size-5" />
              </div>
              <DialogTitle>New review cycle</DialogTitle>
              <DialogDescription>
                Define who is in this cycle, the review period, cadence, and optional self-review deadline.
              </DialogDescription>
            </DialogHeader>

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
                    <option key={v} value={v}>{l}</option>
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

              <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-sm font-medium">Who is included?</p>
                {!hasTeams ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    You have no teams defined yet. This cycle will include{" "}
                    <strong>all active employees</strong>. Add teams under Organisation to limit
                    cycles by team later.
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
                        <span className="font-medium">Selected teams only</span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          Only employees whose team matches a selection (by team name on their
                          profile).
                        </span>
                        {!form.watch("scope_entire_org") && (
                          <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto pr-1">
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

            <DialogFooter className="mt-4 border-t border-border/60 pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2Icon className="size-4 animate-spin" /> Creating…</>
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
