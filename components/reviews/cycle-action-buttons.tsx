"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, PlayIcon, Trash2Icon } from "lucide-react";

import {
  closeReviewCycle,
  deleteReviewCycle,
  openReviewCycle,
} from "@/actions/review-cycles";
import { Button } from "@/components/ui/button";
import type { ReviewCycleRow } from "@/types/database";

export function CycleActionButtons({ cycle }: { cycle: ReviewCycleRow }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, key: string) {
    setBusy(key);
    setError(null);
    const res = await action();
    setBusy(null);
    if (!res.ok) {
      setError((res as { ok: false; error: string }).error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="text-destructive text-xs">{error}</span>
      )}

      {cycle.status === "draft" && (
        <Button
          size="sm"
          className="gap-1.5"
          disabled={busy !== null}
          onClick={() =>
            run(() => openReviewCycle({ cycleId: cycle.id }), "open")
          }
        >
          {busy === "open" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <PlayIcon className="size-4" />
          )}
          Open cycle
        </Button>
      )}

      {cycle.status === "open" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={busy !== null}
          onClick={() =>
            run(() => closeReviewCycle({ cycleId: cycle.id }), "close")
          }
        >
          {busy === "close" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CheckCircle2Icon className="size-4" />
          )}
          Close cycle
        </Button>
      )}

      {cycle.status !== "closed" && (
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
          disabled={busy !== null}
          onClick={() =>
            run(() => deleteReviewCycle({ cycleId: cycle.id }), "delete")
          }
        >
          {busy === "delete" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
          Delete
        </Button>
      )}
    </div>
  );
}
