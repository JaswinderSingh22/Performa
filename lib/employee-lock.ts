import "server-only";

import type { OrgAccess } from "@/lib/org-context";
import { getEffectivePlanFromOrg } from "@/lib/billing/getBillingState";
import { getMaxEmployees, isUnlimitedLimit, normalizePlan } from "@/lib/plans";

export type LockState =
  | { locked: false; seatCap: number; activeSeats: number }
  | { locked: true; seatCap: number; activeSeats: number };

export async function getEmployeeLockState(
  access: OrgAccess,
  employeeId: string,
): Promise<LockState> {
  const { data: org } = await access.supabase
    .from("organizations")
    .select(
      "id, plan, subscription_status, subscription_current_end, razorpay_subscription_id",
    )
    .eq("id", access.orgId)
    .maybeSingle();

  if (!org) {
    // Fail-open: don’t lock if we can’t resolve state.
    return { locked: false, seatCap: Number.MAX_SAFE_INTEGER, activeSeats: 0 };
  }

  const effectivePlan = normalizePlan(getEffectivePlanFromOrg(org));
  const seatCap = getMaxEmployees(effectivePlan);
  if (isUnlimitedLimit(seatCap)) {
    return { locked: false, seatCap, activeSeats: 0 };
  }

  // Avoid expensive COUNT(*) on large workspaces:
  // Fetch seatCap + 1 newest employees to determine if we're over cap.
  const { data: newest } = await access.supabase
    .from("employees")
    .select("id")
    .eq("org_id", access.orgId)
    .order("created_at", { ascending: false })
    .limit(seatCap + 1);

  const rows = newest ?? [];
  if (rows.length <= seatCap) {
    return { locked: false, seatCap, activeSeats: rows.length };
  }

  const active = new Set(rows.slice(0, seatCap).map((r) => r.id));
  return {
    locked: !active.has(employeeId),
    seatCap,
    activeSeats: seatCap,
  };
}

export async function assertEmployeeUnlocked(
  access: OrgAccess,
  employeeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const state = await getEmployeeLockState(access, employeeId);
  if (!state.locked) return { ok: true };
  return {
    ok: false,
    error:
      "This employee is locked because your workspace is over its seat limit. Upgrade or remove employees to unlock editing.",
  };
}

