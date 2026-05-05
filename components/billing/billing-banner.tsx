"use client";

import Link from "next/link";

import type { BillingState } from "@/lib/billing/getBillingState";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmtShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function BillingBanner({
  state,
}: {
  state: BillingState | null;
}): React.ReactElement | null {
  if (!state) return null;
  if (state.kind === "free") return null;
  if (state.kind === "active" && !state.expiringSoon) return null;

  if (state.kind === "activation_failed") {
    return (
      <div className="border-border/60 bg-amber-500/[0.08] text-foreground border-b px-6 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            Payment didn&apos;t complete, so your subscription isn&apos;t active yet. Retry to
            unlock Pro.
          </p>
          <Link
            href="/billing"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-lg")}
          >
            Retry payment
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "active") {
    return (
      <div className="border-border/60 text-foreground relative border-b px-6 py-3 text-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        />
        <div className="bg-gradient-to-r from-primary/[0.14] via-violet-500/[0.10] to-emerald-500/[0.10] -mx-6 -my-3 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            Your subscription renews on{" "}
            <span className="font-medium tabular-nums">{fmtShort(state.currentPeriodEnd)}</span>.
            Please ensure your payment method is valid.
          </p>
          <Link
            href="/billing"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-lg")}
          >
            Manage billing
          </Link>
        </div>
        </div>
      </div>
    );
  }

  if (state.kind === "grace") {
    return (
      <div className="border-border/60 bg-amber-500/[0.09] text-foreground border-b px-6 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            {state.statusHint === "failed"
              ? "Payment issue detected."
              : "Your subscription period ended."}{" "}
            You have{" "}
            <span className="font-medium tabular-nums">{state.daysLeft}</span>{" "}
            day(s) to restore access before Free plan restrictions apply.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-lg"
              render={<Link href="/billing" />}
              nativeButton={false}
            >
              Retry payment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "expired") {
    return (
      <div className="border-border/60 bg-muted/40 text-foreground border-b px-6 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            Your subscription ended. You&apos;re now on the Free plan. Upgrade to restore full
            access.
          </p>
          <Button
            size="sm"
            className="rounded-lg"
            render={<Link href="/billing" />}
            nativeButton={false}
          >
            Upgrade
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

