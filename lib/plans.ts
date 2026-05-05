export type PlanId = "free" | "pro" | "pro_plus";

export const PLAN_IDS: readonly PlanId[] = ["free", "pro", "pro_plus"];

export type PlanFeature =
  | "basic_rollups"
  | "limited_reviews"
  | "departments"
  | "teams"
  | "rollups"
  | "reviews"
  | "standard_cadence"
  | "advanced_analytics"
  | "bias_detection"
  | "priority_support";

export type InternalUsageLimit = {
  orgMonthly: number;
};

export type PlanConfig = {
  maxEmployees: number | "unlimited";
  aiUsageVisible: boolean;
  features: PlanFeature[];
  priceMonthlyInr?: number;
  /** Internal-only quota config for backend enforcement. */
  internalUsageLimit: InternalUsageLimit;
};

export function normalizePlan(raw: string | null | undefined): PlanId {
  const p = (raw ?? "free").toLowerCase().trim();
  if (p === "pro" || p === "pro_plus") return p;
  return "free";
}

/** Sentinel for unlimited internal limits in server checks. */
export const UNLIMITED_LIMIT = Number.MAX_SAFE_INTEGER;

export function isUnlimitedLimit(value: number): boolean {
  return value >= UNLIMITED_LIMIT;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    maxEmployees: 5,
    aiUsageVisible: false,
    features: ["basic_rollups", "limited_reviews"],
    internalUsageLimit: {
      orgMonthly: 10,
    },
  },
  pro: {
    priceMonthlyInr: 9_999,
    maxEmployees: 100,
    aiUsageVisible: false,
    features: ["departments", "teams", "rollups", "reviews", "standard_cadence"],
    internalUsageLimit: {
      orgMonthly: 1_500,
    },
  },
  pro_plus: {
    priceMonthlyInr: 24_999,
    maxEmployees: "unlimited",
    aiUsageVisible: false,
    features: [
      "departments",
      "teams",
      "rollups",
      "reviews",
      "standard_cadence",
      "advanced_analytics",
      "bias_detection",
      "priority_support",
    ],
    internalUsageLimit: {
      orgMonthly: 5_000,
    },
  },
};

export const PLAN_PRICES_INR = {
  pro: { monthly: PLANS.pro.priceMonthlyInr ?? 9_999, yearly: 99_990 },
  pro_plus: { monthly: PLANS.pro_plus.priceMonthlyInr ?? 24_999, yearly: 249_990 },
} as const;

export function getPlanConfig(plan: PlanId): PlanConfig {
  return PLANS[plan];
}

export function getMaxEmployees(plan: PlanId): number {
  const max = PLANS[plan].maxEmployees;
  return max === "unlimited" ? UNLIMITED_LIMIT : max;
}

export function getInternalUsageLimit(plan: PlanId): {
  orgMonthlyCap: number;
} {
  const u = PLANS[plan].internalUsageLimit;
  return {
    orgMonthlyCap: u.orgMonthly,
  };
}

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
