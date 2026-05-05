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

/** Sentinel for "no practical cap" in plan checks/UI. */
export const UNLIMITED_LIMIT = Number.MAX_SAFE_INTEGER;

export function isUnlimitedLimit(value: number): boolean {
  return value >= UNLIMITED_LIMIT;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    seats: 5,
    aiPerEmployeePerMonth: 5,
    aiOrgMonthlyCap: 5,
  },
  pro: {
    seats: 100,
    aiPerEmployeePerMonth: UNLIMITED_LIMIT,
    aiOrgMonthlyCap: 1000,
  },
  pro_plus: {
    seats: UNLIMITED_LIMIT,
    aiPerEmployeePerMonth: 20,
    aiOrgMonthlyCap: UNLIMITED_LIMIT,
  },
};

/** Display prices in INR (Razorpay charges in INR regardless of manager country). */
export const PLAN_PRICES_INR = {
  pro: { monthly: 9_999, yearly: 99_990 },
  pro_plus: { monthly: 19_999, yearly: 199_990 },
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

/** Paid plan strength: Pro+ &gt; Pro &gt; Free (for upgrades and checkout rules). */
export function paidPlanTier(plan: PlanId): number {
  if (plan === "pro_plus") return 2;
  if (plan === "pro") return 1;
  return 0;
}

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
