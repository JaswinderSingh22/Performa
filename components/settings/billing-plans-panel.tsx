"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";

import { createRazorpaySubscription } from "@/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  PLANS,
  PLAN_PRICES_INR,
  effectiveMonthlyYearly,
  formatInr,
  normalizePlan,
  paidPlanTier,
  planLabel,
  type PaidPlanKey,
  type PlanId,
} from "@/lib/plans";

type RazorpayInstance = { open: () => void };

/** Only UPI (QR + intent) and cards; hides netbanking, wallets, EMI, etc. */
const CHECKOUT_PAYMENT_CONFIG = {
  display: {
    blocks: {
      upi_card: {
        name: "Pay with UPI or card",
        instruments: [{ method: "upi" }, { method: "card" }],
      },
    },
    sequence: ["block.upi_card"],
    preferences: {
      show_default_blocks: false,
    },
  },
};

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  readonly theme?: { color: string };
  config?: typeof CHECKOUT_PAYMENT_CONFIG;
  handler: () => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as Window & { Razorpay?: unknown };
  if (w.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(s);
  });
}

function featureList(plan: Exclude<PlanId, "free">): string[] {
  const config = PLANS[plan];
  const seatsText =
    config.maxEmployees === "unlimited"
      ? "Unlimited people in your directory"
      : `Up to ${config.maxEmployees} people in your directory`;
  return [
    seatsText,
    ...config.features
      .filter(
        (f) =>
          f === "csv_employee_import" ||
          f === "advanced_analytics" ||
          f === "priority_support",
      )
      .map((f) =>
        f === "csv_employee_import"
          ? "CSV employee import"
          : f === "advanced_analytics"
            ? "Advanced analytics insights"
            : "Priority support",
      ),
    "AI-powered roll-ups included",
    "Fair usage applies",
    "Invoices settle in ₹ INR through Razorpay",
  ];
}

export function BillingPlansPanel({
  workspacePlan,
  subscriptionStatus,
  billingInterval,
  canManageBilling,
  razorpayReady,
}: {
  workspacePlan: string;
  subscriptionStatus: string;
  billingInterval: "month" | "year" | null;
  canManageBilling: boolean;
  razorpayReady: boolean;
}): React.ReactElement {
  const plan = normalizePlan(workspacePlan);
  const router = useRouter();
  const [interval, setInterval] = React.useState<"month" | "year">(
    billingInterval ?? "month",
  );
  const [busy, setBusy] = React.useState<PaidPlanKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (billingInterval === "month" || billingInterval === "year") {
      setInterval(billingInterval);
    }
  }, [billingInterval]);

  const orgIntervalLabel =
    billingInterval === "year"
      ? "Billed yearly"
      : billingInterval === "month"
        ? "Billed monthly"
        : null;

  const startCheckout = async (target: PaidPlanKey): Promise<void> => {
    setError(null);
    setBusy(target);
    try {
      await loadCheckoutScript();
      const res = await createRazorpaySubscription({
        targetPlan: target,
        interval,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const amount =
        PLAN_PRICES_INR[target][interval === "month" ? "monthly" : "yearly"];

      const refreshAfterCheckout = (): void => {
        queueMicrotask(() => router.refresh());
        window.setTimeout(() => router.refresh(), 2000);
      };

      let didScheduleRefresh = false;
      const scheduleRefreshOnce = (): void => {
        if (didScheduleRefresh) return;
        didScheduleRefresh = true;
        refreshAfterCheckout();
      };

      const rzp = new window.Razorpay({
        key: res.keyId,
        subscription_id: res.subscriptionId,
        name: "Performa",
        description: `${planLabel(target)}, ${
          interval === "month" ? "monthly" : "yearly"
        } — ${formatInr(amount)}`,
        theme: { color: "#4f46e5" },
        config: CHECKOUT_PAYMENT_CONFIG,
        handler: () => {
          scheduleRefreshOnce();
        },
        modal: {
          ondismiss: () => {
            scheduleRefreshOnce();
          },
        },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open checkout.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-border/75 from-card/98 to-muted/[0.12] overflow-hidden bg-gradient-to-br shadow-md">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-heading text-xl tracking-tight">
            Plans & billing
          </CardTitle>
          <Badge variant="outline" className="font-normal">
            All prices in ₹ INR
          </Badge>
        </div>
        <CardDescription className="max-w-2xl text-pretty leading-relaxed">
          Built for org-level usage with predictable INR billing via Razorpay.
          AI-powered roll-ups are included and fair usage applies. We never store
          card numbers on our servers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {!razorpayReady ? (
          <p className="border-amber-500/30 bg-amber-500/8 text-foreground rounded-xl border px-4 py-3 text-sm leading-relaxed">
            Razorpay is not configured on this deployment yet. Set{" "}
            <span className="font-mono text-xs">NEXT_PUBLIC_RAZORPAY_KEY_ID</span> and
            the matching secret keys so admins can upgrade online.
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-sm font-medium">Billing cadence</span>
          <div className="bg-muted/40 flex rounded-full border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={
                interval === "month"
                  ? "bg-background text-foreground rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                  : "text-muted-foreground hover:text-foreground rounded-full bg-transparent px-4 py-1.5 text-xs font-medium transition-colors"
              }
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={
                interval === "year"
                  ? "bg-background text-foreground rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                  : "text-muted-foreground hover:text-foreground rounded-full bg-transparent px-4 py-1.5 text-xs font-medium transition-colors"
              }
            >
              Yearly (save ~17%)
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div
            className={
              plan === "free"
                ? "border-primary/35 bg-primary/[0.04] flex flex-col rounded-2xl border p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.12)]"
                : "border-border/70 bg-muted/15 flex flex-col rounded-2xl border p-4"
            }
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold">Free</h3>
              {plan === "free" ? (
                <Badge variant="secondary" className="font-normal">
                  Current
                </Badge>
              ) : null}
            </div>
            <p className="text-foreground text-2xl font-bold tabular-nums">
              {formatInr(0)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {PLANS.free.maxEmployees} people · AI-powered roll-ups included.
            </p>
            <ul className="text-muted-foreground mt-4 space-y-2 text-xs leading-relaxed">
              <li className="flex gap-2">
                <CheckCircle2Icon className="text-primary mt-0.5 size-3.5 shrink-0" />
                Core reviews, notes, achievements
              </li>
              <li className="flex gap-2">
                <CheckCircle2Icon className="text-primary mt-0.5 size-3.5 shrink-0" />
                AI-powered roll-ups included
              </li>
              <li className="flex gap-2">
                <CheckCircle2Icon className="text-primary mt-0.5 size-3.5 shrink-0" />
                Fair usage applies
              </li>
            </ul>
          </div>

          {(["pro", "pro_plus"] as const).map((paid) => {
            const price =
              interval === "month"
                ? PLAN_PRICES_INR[paid].monthly
                : PLAN_PRICES_INR[paid].yearly;
            const perMoNote =
              interval === "year"
                ? `≈ ${formatInr(Math.round(effectiveMonthlyYearly(paid) * 10) / 10)} / mo effective · one ₹ invoice per year`
                : "Paid monthly in ₹ INR";
            const isSamePlan = plan === paid && subscriptionStatus !== "none";
            const isExactCurrent =
              isSamePlan &&
              (billingInterval === "month" || billingInterval === "year"
                ? billingInterval === interval
                : true);
            const isSwitchCadence =
              isSamePlan &&
              (billingInterval === "month" || billingInterval === "year") &&
              billingInterval !== interval;
            return (
              <div
                key={paid}
                className={
                  isExactCurrent
                    ? "border-primary/35 from-primary/[0.08] flex flex-col rounded-2xl border bg-gradient-to-br to-transparent p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.12)]"
                    : "border-border/70 from-primary/[0.04] flex flex-col rounded-2xl border bg-gradient-to-br to-transparent p-4"
                }
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-heading text-lg font-semibold">
                    {planLabel(paid)}
                  </h3>
                  {isExactCurrent ? (
                    <div className="flex items-center gap-2">
                      <Badge className="font-normal">Current</Badge>
                      {orgIntervalLabel ? (
                        <Badge variant="secondary" className="font-normal">
                          {orgIntervalLabel}
                        </Badge>
                      ) : null}
                    </div>
                  ) : isSwitchCadence ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-normal">
                        Current · {orgIntervalLabel ?? "active"}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        Switch cadence
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="font-normal">
                      <SparklesIcon className="mr-1 size-3" aria-hidden />
                      Upgrade
                    </Badge>
                  )}
                </div>
                <p className="text-foreground text-2xl font-bold tabular-nums">
                  {formatInr(price)}
                  <span className="text-muted-foreground text-sm font-medium">
                    {interval === "month" ? "/mo" : "/yr"}
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">{perMoNote}</p>
                <Separator className="my-3" />
                <ul className="text-muted-foreground flex-1 space-y-2 text-xs leading-relaxed">
                  {featureList(paid).map((line) => (
                    <li key={line} className="flex gap-2">
                      <CheckCircle2Icon className="text-primary mt-0.5 size-3.5 shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="mt-4 w-full rounded-xl gap-2"
                  disabled={
                    !canManageBilling ||
                    !razorpayReady ||
                    busy !== null ||
                    isExactCurrent ||
                    (subscriptionStatus === "active" &&
                      plan !== "free" &&
                      paidPlanTier(paid) <= paidPlanTier(plan))
                  }
                  onClick={() => void startCheckout(paid)}
                >
                  {busy === paid ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Starting checkout…
                    </>
                  ) : isSwitchCadence ? (
                    interval === "year"
                      ? "Switch to yearly"
                      : "Switch to monthly"
                  ) : (
                    `Pay with Razorpay`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {!canManageBilling ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Only workspace admins can change plans. Ask an admin to upgrade if you need
            more seats or AI capacity.
          </p>
        ) : null}
        {plan !== "free" && subscriptionStatus === "active" ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {plan === "pro" ? (
              <>
                You can upgrade to Pro+ from this page. To cancel billing or downgrade,
                use the links in Razorpay subscription emails or your Razorpay dashboard.
                If you cancel auto-renew, access stays on your paid tier until the current
                billing period ends.
              </>
            ) : (
              <>
                To cancel or change billing, use the links in Razorpay subscription emails
                or your Razorpay dashboard. If you cancel auto-renew, access stays on your
                paid tier until the current billing period ends.
              </>
            )}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="text-muted-foreground border-border/60 border-t bg-muted/10 text-[11px] leading-relaxed">
        Limits and pricing are org-wide. AI-powered roll-ups are included and fair
        usage applies.
      </CardFooter>
    </Card>
  );
}
