"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";

import {
  closeReviewCycle,
  deleteReviewCycle,
  openReviewCycle,
} from "@/actions/review-cycles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReviewCycleRow } from "@/types/database";

export function CycleActionButtons({ cycle }: { cycle: ReviewCycleRow }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

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

  async function confirmDelete() {
    setBusy("delete");
    setError(null);
    const res = await deleteReviewCycle({ cycleId: cycle.id });
    setBusy(null);
    if (!res.ok) {
      setError((res as { ok: false; error: string }).error);
      return;
    }
    setDeleteOpen(false);
    router.push("/reviews");
    router.refresh();
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
        <>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
            disabled={busy !== null}
            type="button"
            onClick={() => {
              setDeleteOpen(true);
              setError(null);
            }}
          >
            <Trash2Icon className="size-4" />
            Delete
          </Button>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="bg-destructive/10 text-destructive mb-3 flex size-10 items-center justify-center rounded-xl">
                  <AlertTriangleIcon className="size-5" />
                </div>
                <DialogTitle>Delete this review cycle?</DialogTitle>
                <DialogDescription className="text-left">
                  <span className="text-foreground font-medium">{cycle.title}</span>{" "}
                  will be permanently removed. Submission data for this cycle will be deleted
                  with it. Closed cycles cannot be deleted from here.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy === "delete"}
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy === "delete"}
                  className="gap-1.5"
                  onClick={() => void confirmDelete()}
                >
                  {busy === "delete" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                  Delete cycle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
