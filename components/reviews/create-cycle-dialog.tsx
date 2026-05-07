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

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  cadence: z.enum(["monthly", "quarterly", "mid_year", "yearly"]),
  period_start: z.string().min(1, "Required"),
  period_end: z.string().min(1, "Required"),
  self_review_due: z.string().optional(),
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

export function CreateCycleDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      cadence: "quarterly",
      period_start: todayStr(),
      period_end: quarterEnd(todayStr()),
      self_review_due: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await createReviewCycle({
      ...values,
      self_review_due: values.self_review_due?.trim() || undefined,
    });
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    setOpen(false);
    form.reset();
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
                Define the period, cadence, and deadline for employee self-reviews.
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
