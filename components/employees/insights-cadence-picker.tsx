"use client";

import type { ReactElement } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";

import { updateEmployeeReviewCadence } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import {
  REVIEW_CADENCE_LABELS,
  type ReviewCadence,
} from "@/lib/review-cadence";
import { cn } from "@/lib/utils";

const CADENCES: readonly ReviewCadence[] = [
  "monthly",
  "quarterly",
  "mid_year",
  "yearly",
];

export function InsightsCadencePicker({
  employeeId,
  value,
}: {
  employeeId: string;
  value: ReviewCadence;
}): ReactElement {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onPick = async (next: ReviewCadence): Promise<void> => {
    if (next === value || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await updateEmployeeReviewCadence({
        employeeId,
        reviewCadence: next,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Reminders use this schedule—aligned with roll-up period presets.
      </p>
      <div className="flex flex-wrap gap-2">
        {CADENCES.map((c) => (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={value === c ? "default" : "outline"}
            disabled={busy}
            className={cn("h-8 rounded-full px-3 text-xs", busy && "opacity-70")}
            onClick={() => void onPick(c)}
          >
            {REVIEW_CADENCE_LABELS[c]}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
