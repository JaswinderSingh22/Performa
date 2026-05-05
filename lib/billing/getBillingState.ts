import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/admin";
import { normalizePlan, type PlanId } from "@/lib/plans";

export const GRACE_DAYS = 4 as const;
export const EXPIRING_SOON_DAYS = 5 as const;

type OrgBillingRow = {
  id: string;
  plan: string | null;
  subscription_status: string | null;
  subscription_current_end: string | null;
  razorpay_subscription_id: string | null;
};

export type BillingState =
  | {
      kind: "free";
      effectivePlan: "free";
    }
  | {
      kind: "active";
      effectivePlan: Exclude<PlanId, "free">;
      currentPeriodEnd: string | null;
      expiringSoon: boolean;
      expiringInDays: number | null;
    }
  | {
      kind: "activation_failed";
      effectivePlan: "free";
      reason: "payment_failed" | "unknown";
    }
  | {
      kind: "grace";
      effectivePlan: Exclude<PlanId, "free">;
      currentPeriodEnd: string;
      gracePeriodEnd: string;
      daysLeft: number;
      statusHint: "failed" | "ended";
    }
  | {
      kind: "expired";
      effectivePlan: "free";
      currentPeriodEnd: string | null;
      gracePeriodEnd: string | null;
    };

function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysUntil(now: Date, iso: string): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const ms = t - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function parsePaidPlan(raw: string | null | undefined): Exclude<PlanId, "free"> | null {
  const p = normalizePlan(raw);
  return p === "pro" || p === "pro_plus" ? p : null;
}

/**
 * Computes billing state for UX + enforcement.
 *
 * Policy:
 * - Grace applies ONLY after a paid period end (subscription_current_end must exist).
 * - First-time payment failures (no current_end) do not get grace; effective plan is free.
 * - Cancelled auto-renew is not treated as grace (user still has access through current_end).
 */
export function computeBillingState(org: OrgBillingRow, now = new Date()): BillingState {
  const status = (org.subscription_status ?? "none").toLowerCase().trim();
  const paidPlan = parsePaidPlan(org.plan);

  if (!paidPlan) return { kind: "free", effectivePlan: "free" };

  const end = org.subscription_current_end;
  const hasEnd = Boolean(end && !Number.isNaN(Date.parse(end)));

  // Payment attempt failed before any paid window was established.
  if (!hasEnd && (status.includes("failed") || status.includes("halted"))) {
    return { kind: "activation_failed", effectivePlan: "free", reason: "payment_failed" };
  }

  // Active / cancelled / paused etc while end is in the future counts as paid access.
  if (hasEnd && end) {
    const endTs = Date.parse(end);
    const nowTs = now.getTime();
    if (nowTs <= endTs) {
      const inDays = daysUntil(now, end);
      const expiringSoon = inDays !== null && inDays <= EXPIRING_SOON_DAYS;
      return {
        kind: "active",
        effectivePlan: paidPlan,
        currentPeriodEnd: end,
        expiringSoon,
        expiringInDays: expiringSoon ? inDays : null,
      };
    }

    const graceEnd = addDaysIso(end, GRACE_DAYS);
    const graceEndTs = Date.parse(graceEnd);
    if (nowTs <= graceEndTs) {
      const left = daysUntil(now, graceEnd);
      return {
        kind: "grace",
        effectivePlan: paidPlan,
        currentPeriodEnd: end,
        gracePeriodEnd: graceEnd,
        daysLeft: Math.max(0, left ?? 0),
        statusHint: status.includes("halt") || status.includes("fail") ? "failed" : "ended",
      };
    }

    return {
      kind: "expired",
      effectivePlan: "free",
      currentPeriodEnd: end,
      gracePeriodEnd: graceEnd,
    };
  }

  // Default: treat as paid until we know otherwise.
  return {
    kind: "active",
    effectivePlan: paidPlan,
    currentPeriodEnd: null,
    expiringSoon: false,
    expiringInDays: null,
  };
}

export function getEffectivePlanFromOrg(org: OrgBillingRow, now = new Date()): PlanId {
  const s = computeBillingState(org, now);
  return s.effectivePlan;
}

/**
 * Optional: lazily downgrade org.plan to free after grace.
 * This keeps DB consistent without needing a cron job.
 */
export async function maybeDowngradeExpiredOrg(org: OrgBillingRow): Promise<void> {
  const state = computeBillingState(org);
  if (state.kind !== "expired") return;
  if (normalizePlan(org.plan) === "free") return;
  // Only downgrade when we can safely match the subscription id.
  if (!org.razorpay_subscription_id) return;

  const admin = createServiceRoleSupabase();
  await admin
    .from("organizations")
    .update({
      plan: "free",
      billing_interval: null,
      razorpay_subscription_id: null,
      subscription_status: org.subscription_status ?? "expired",
      subscription_current_end: null,
    })
    .eq("id", org.id)
    .eq("razorpay_subscription_id", org.razorpay_subscription_id);
}

