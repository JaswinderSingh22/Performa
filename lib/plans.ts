/**
 * Workspace seat & AI limits (enforced server-side). Currency is always INR in-app.
 */
export type PlanId = "free" | "pro" | "pro_plus";

export const PLAN_IDS: readonly PlanId[] = ["free", "pro", "pro_plus"];

export function normalizePlan(raw: string | null | undefined): PlanId {
  const p = (raw ?? "free").toLowerCase().trim();
  if (p === "pro" || p === "pro_plus") return p;
  return "free";
}

export type PlanLimits = {
  /** Max people (employees) in directory */
  seats: number;
  /** Max AI roll-up assists per employee per calendar month (UTC) */
  aiPerEmployeePerMonth: number;
  /** Hard cap on AI assists for the whole org per month (UTC) */
  aiOrgMonthlyCap: number;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    seats: 3,
    aiPerEmployeePerMonth: 1,
    aiOrgMonthlyCap: 3,
  },
  pro: {
    seats: 10,
    aiPerEmployeePerMonth: 50,
    aiOrgMonthlyCap: 150,
  },
  pro_plus: {
    seats: 50,
    aiPerEmployeePerMonth: 50,
    aiOrgMonthlyCap: 600,
  },
};

/** Display prices in INR (Razorpay charges in INR regardless of manager country). */
export const PLAN_PRICES_INR = {
  pro: { monthly: 899, yearly: 8_990 },
  pro_plus: { monthly: 2_899, yearly: 28_990 },
} as const;

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Effective monthly when billed yearly */
export function effectiveMonthlyYearly(plan: Exclude<PlanId, "free">): number {
  const y = PLAN_PRICES_INR[plan].yearly;
  return Math.round((y / 12) * 10) / 10;
}

export function planLabel(plan: PlanId): string {
  switch (plan) {
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "pro_plus":
      return "Pro+";
    default:
      return plan;
  }
}

export type PaidPlanKey = Exclude<PlanId, "free">;

/** Resolve Razorpay plan_id from env; empty string if unset. */
export function getRazorpayPlanId(
  plan: PaidPlanKey,
  interval: "month" | "year",
): string {
  const suffix = interval === "month" ? "MONTHLY" : "YEARLY";
  const key =
    plan === "pro_plus"
      ? `RAZORPAY_PLAN_PRO_PLUS_${suffix}`
      : `RAZORPAY_PLAN_PRO_${suffix}`;
  return process.env[key]?.trim() ?? "";
}
