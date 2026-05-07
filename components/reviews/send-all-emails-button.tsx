"use client";

import * as React from "react";
import { CheckIcon, Loader2Icon, MailIcon, SendIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendReviewEmailsToAllAction } from "@/actions/send-review-email";
import { cn } from "@/lib/utils";

type Team = { id: string; name: string };

type Props = {
  cycleId: string;
  pendingCount: number;
  teams: Team[];
};

type Step = "select-teams" | "confirm" | "result";

export function SendAllEmailsButton({ cycleId, pendingCount, teams }: Props) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("select-teams");
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<Set<string>>(new Set());
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const allTeamsSelected = selectedTeamIds.size === 0;

  function toggleTeam(id: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOpen() {
    setStep("select-teams");
    setSelectedTeamIds(new Set());
    setResult(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSend() {
    setSending(true);
    const teamIds = selectedTeamIds.size > 0 ? [...selectedTeamIds] : [];
    const res = await sendReviewEmailsToAllAction(cycleId, teamIds);
    setSending(false);
    setResult(res);
    setStep("result");
  }

  const selectedTeamNames =
    selectedTeamIds.size === 0
      ? "all teams"
      : teams
          .filter((t) => selectedTeamIds.has(t.id))
          .map((t) => t.name)
          .join(", ");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleOpen}
        disabled={pendingCount === 0}
        title={pendingCount === 0 ? "No pending submissions" : undefined}
      >
        <MailIcon className="size-4" />
        Send to all
        {pendingCount > 0 && (
          <span className="bg-primary/12 text-primary rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums">
            {pendingCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          {step === "result" && result ? (
            <>
              <DialogHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckIcon className="size-5" />
                </div>
                <DialogTitle>Emails sent</DialogTitle>
                <DialogDescription>
                  Review form links have been sent to your team members.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className={cn("grid gap-3", result.failed > 0 ? "grid-cols-2" : "grid-cols-1")}>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {result.sent}
                    </p>
                    <p className="text-muted-foreground text-xs">Sent successfully</p>
                  </div>
                  {result.failed > 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-center">
                      <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {result.failed}
                      </p>
                      <p className="text-muted-foreground text-xs">Failed</p>
                    </div>
                  )}
                </div>
                {result.errors.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3">
                    <p className="mb-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Issues:
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      {result.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" onClick={handleClose}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <SendIcon className="size-5" />
                </div>
                <DialogTitle>Send review forms</DialogTitle>
                <DialogDescription>
                  Choose which teams to notify, or send to all pending employees at once.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-1">
                {/* Team selector */}
                {teams.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Send to</p>
                    <div className="space-y-1.5">
                      {/* All teams option */}
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds(new Set())}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                          allTeamsSelected
                            ? "border-primary/30 bg-primary/8 text-primary font-medium"
                            : "border-border/60 hover:bg-muted/40",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                            allTeamsSelected
                              ? "border-primary bg-primary"
                              : "border-border",
                          )}
                        >
                          {allTeamsSelected && (
                            <div className="size-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <UsersIcon className="size-4 shrink-0 opacity-60" />
                        All teams
                        <span className="text-muted-foreground ml-auto text-xs">
                          {pendingCount} pending
                        </span>
                      </button>

                      {/* Individual teams */}
                      {teams.map((team) => {
                        const isSelected = selectedTeamIds.has(team.id);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => toggleTeam(team.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                              isSelected
                                ? "border-primary/30 bg-primary/8 text-primary font-medium"
                                : "border-border/60 hover:bg-muted/40",
                            )}
                          >
                            <div
                              className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded border-2",
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-border",
                              )}
                            >
                              {isSelected && (
                                <CheckIcon className="size-2.5 text-white" />
                              )}
                            </div>
                            <span className="flex-1 truncate">{team.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                  Will send emails to all <strong className="text-foreground">pending</strong>{" "}
                  employees in <strong className="text-foreground">{selectedTeamNames}</strong>.
                  Employees who already submitted won&apos;t be emailed.
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <MailIcon className="size-4" />
                      Send emails
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
