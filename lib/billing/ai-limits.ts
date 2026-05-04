import "server-only";

import type { OrgAccess } from "@/lib/org-context";
import {
  normalizePlan,
  PLAN_LIMITS,
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
  const limits = PLAN_LIMITS[plan];

  const monthKey = utcMonthKey();

  const [{ data: usageRows }, { data: employeeRow }] = await Promise.all([
    access.supabase
      .from("employee_ai_generation_usage")
      .select("count")
      .eq("org_id", access.orgId)
      .eq("month_key", monthKey),
    access.supabase
      .from("employee_ai_generation_usage")
      .select("count")
      .eq("org_id", access.orgId)
      .eq("employee_id", employeeId)
      .eq("month_key", monthKey)
      .maybeSingle(),
  ]);

  const orgMonthlyTotal =
    usageRows?.reduce((acc, row) => acc + (row.count ?? 0), 0) ?? 0;
  const employeeMonth = employeeRow?.count ?? 0;

  if (orgMonthlyTotal >= limits.aiOrgMonthlyCap) {
    const hint =
      plan === "free"
        ? "Upgrade to Pro for more AI-assisted roll-ups (still billed in ₹)."
        : "Your workspace hit this month\u2019s AI assist cap. Try again next month or contact support.";
    return {
      ok: false,
      reason: `This workspace has used all ${limits.aiOrgMonthlyCap} AI assists for this calendar month (UTC). ${hint}`,
    };
  }

  if (employeeMonth >= limits.aiPerEmployeePerMonth) {
    return {
      ok: false,
      reason: `Under your ${plan} plan, each person can use up to ${limits.aiPerEmployeePerMonth} AI assist(s) per month for this workspace.`,
    };
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
