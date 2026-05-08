"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  Loader2Icon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";

import { finalizeHrReview, rejectHrReview } from "@/actions/review-cycles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewWorkflowStatus } from "@/types/database";

export function HrReviewPanel({
  selfReviewId,
  remarksId,
  workflowStatus,
  defaultHrRemarks,
  finalizedAt,
}: {
  selfReviewId: string;
  remarksId: string | null;
  workflowStatus: ReviewWorkflowStatus;
  defaultHrRemarks: string;
  finalizedAt: string | null;
}) {
  const router = useRouter();
  const [hrRemarks, setHrRemarks] = React.useState(defaultHrRemarks);
  const [rejectReason, setRejectReason] = React.useState("");
  const [finalizeLoading, setFinalizeLoading] = React.useState(false);
  const [rejectLoading, setRejectLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHrRemarks(defaultHrRemarks);
  }, [defaultHrRemarks]);

  const isFinal = workflowStatus === "finalized";
  const canAct = workflowStatus === "hr_review_pending" && remarksId;

  async function handleFinalize() {
    if (!remarksId) return;
    setFinalizeLoading(true);
    setErrorMsg(null);
    const res = await finalizeHrReview({
      selfReviewId,
      remarksId,
      hr_remarks: hrRemarks,
    });
    setFinalizeLoading(false);
    if (!res.ok) {
      setErrorMsg((res as { ok: false; error: string }).error);
    } else {
      router.refresh();
    }
  }

  async function handleReject() {
    if (!remarksId) return;
    setRejectLoading(true);
    setErrorMsg(null);
    const res = await rejectHrReview({
      selfReviewId,
      remarksId,
      rejection_reason: rejectReason,
    });
    setRejectLoading(false);
    if (!res.ok) {
      setErrorMsg((res as { ok: false; error: string }).error);
    } else {
      setRejectReason("");
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 px-5 py-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <ShieldCheckIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">HR review</p>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isFinal
              ? "Record is finalized — no edits or deletions permitted."
              : canAct
                ? "Add organizational notes, approve to lock the record, or request revisions."
                : "Approval actions appear after the manager sends this review to HR."}
          </p>
          {finalizedAt && (
            <p className="text-muted-foreground mt-1 text-xs">
              Finalized{" "}
              {new Date(finalizedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="hr-remarks" className="mb-2 block">
          HR remarks
        </Label>
        <Textarea
          id="hr-remarks"
          value={hrRemarks}
          onChange={(e) => setHrRemarks(e.target.value)}
          readOnly={!canAct || isFinal}
          rows={isFinal ? 4 : 5}
          placeholder="Optional context or summary for HR’s view of this review cycle…"
          className="text-sm resize-none"
        />
      </div>

      {canAct && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
          <Label htmlFor="reject-reason" className="text-destructive">
            Request revisions (optional path)
          </Label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain what the manager should adjust before resubmitting…"
            className="text-sm resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              disabled={rejectLoading || finalizeLoading}
              onClick={handleReject}
            >
              {rejectLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <XCircleIcon className="size-4" />
              )}
              Reject & send back
            </Button>
            <Button
              type="button"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={finalizeLoading || rejectLoading}
              onClick={handleFinalize}
            >
              {finalizeLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
              Approve & finalize
            </Button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-destructive text-sm">{errorMsg}</p>
      )}
    </div>
  );
}
