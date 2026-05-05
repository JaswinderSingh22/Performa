import "server-only";

import type { OrgAccess } from "@/lib/org-context";
import {
  getInternalUsageLimit,
  isUnlimitedLimit,
  normalizePlan,
  type PlanId,
} from "@/lib/plans";

/** UTC calendar month bucket YYYY-MM */
export function utcMonthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export type AiQuotaCheck =
  | { ok: true }
  | { ok: false; reason: string };

export async function assertAiAssistAllowedForEmployee(
  access: OrgAccess,
  employeeId: string,
): Promise<AiQuotaCheck> {
  void employeeId;
  const { data: org, error: orgErr } = await access.supabase
    .from("organizations")
    .select("plan")
    .eq("id", access.orgId)
    .maybeSingle();

  if (orgErr || !org?.plan) {
    return {
      ok: false,
      reason: "Could not resolve your workspace plan. Try again in a moment.",
    };
  }

  const plan: PlanId = normalizePlan(org.plan);
  const limits = getInternalUsageLimit(plan);

  const monthKey = utcMonthKey();
  const { data: usageRows } = await access.supabase
    .from("employee_ai_generation_usage")
    .select("count")
    .eq("org_id", access.orgId)
    .eq("month_key", monthKey);

  // Org usage is the SUM(count) for this month bucket.
  const orgMonthlyTotal = usageRows?.reduce((acc, row) => acc + (row.count ?? 0), 0) ?? 0;

  if (!isUnlimitedLimit(limits.orgMonthlyCap) && orgMonthlyTotal >= limits.orgMonthlyCap) {
    console.warn("AI soft limit exceeded", {
      org_id: access.orgId,
      plan,
      usage: orgMonthlyTotal,
      limit: limits.orgMonthlyCap,
      timestamp: new Date().toISOString(),
    });
  }

  if (!isUnlimitedLimit(limits.orgMonthlyCap) && orgMonthlyTotal > limits.orgMonthlyCap * 2) {
    console.error("Extreme AI usage spike detected", {
      org_id: access.orgId,
      plan,
      usage: orgMonthlyTotal,
      limit: limits.orgMonthlyCap,
      timestamp: new Date().toISOString(),
    });
  }

  return { ok: true };
}

export async function recordAiAssistUsage(
  access: OrgAccess,
  employeeId: string,
): Promise<void> {
  const monthKey = utcMonthKey();
  const { data: existing } = await access.supabase
    .from("employee_ai_generation_usage")
    .select("id, count")
    .eq("employee_id", employeeId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (!existing) {
    await access.supabase.from("employee_ai_generation_usage").insert({
      org_id: access.orgId,
      employee_id: employeeId,
      month_key: monthKey,
      count: 1,
    });
    return;
  }

  await access.supabase
    .from("employee_ai_generation_usage")
    .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
    .eq("id", existing.id);
}
