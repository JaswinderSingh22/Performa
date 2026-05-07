"use server";

import { getOrgAccess } from "@/lib/org-context";
import { createServiceRoleSupabase } from "@/lib/supabase/admin";
import { sendReviewFormEmail } from "@/lib/email";

export type SendResult = {
  success: boolean;
  employeeName?: string;
  error?: string;
};

/**
 * Send a review form email to a single employee.
 * Allowed for: admin, hr, manager, tl
 */
export async function sendReviewEmailAction(
  employeeId: string,
): Promise<SendResult> {
  const access = await getOrgAccess();
  if (!access) return { success: false, error: "Not authenticated." };

  const allowedRoles = ["admin", "hr", "manager", "tl"];
  if (!access.role || !allowedRoles.includes(access.role)) {
    return { success: false, error: "You don't have permission to send review invites." };
  }

  // Use service role to bypass RLS for reading cycle/review data
  const admin = createServiceRoleSupabase();

  // Find the open cycle's self-review for this employee
  const { data: selfReview } = await admin
    .from("employee_self_reviews")
    .select("form_token, review_cycle_id, status")
    .eq("employee_id", employeeId)
    .eq("org_id", access.orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selfReview?.form_token) {
    return { success: false, error: "No active review form found for this employee. The employee may have already submitted." };
  }

  // Fetch cycle info
  const { data: cycle } = await admin
    .from("review_cycles")
    .select("title, self_review_due, status")
    .eq("id", selfReview.review_cycle_id)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!cycle || cycle.status === "closed") {
    return { success: false, error: "Review cycle is closed or not found." };
  }

  // Get employee email
  const { data: employee } = await admin
    .from("employees")
    .select("name, email")
    .eq("id", employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!employee?.email) {
    return { success: false, error: "Employee email not found." };
  }

  const result = await sendReviewFormEmail({
    to: employee.email,
    employeeName: employee.name,
    cycleTitle: (cycle.title as string) ?? "Performance Review",
    formToken: selfReview.form_token,
    deadline: cycle.self_review_due as string | null,
  });

  return { ...result, employeeName: employee.name };
}

/**
 * Send review form emails to pending employees in a cycle.
 * teamIds = [] means "all teams". Pass specific team IDs to filter by team.
 * Allowed for: admin, hr, manager, tl
 */
export async function sendReviewEmailsToAllAction(
  cycleId: string,
  teamIds: string[] = [],
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const access = await getOrgAccess();
  if (!access) return { sent: 0, failed: 0, errors: ["Not authenticated."] };

  const allowedRoles = ["admin", "hr", "manager", "tl"];
  if (!access.role || !allowedRoles.includes(access.role)) {
    return { sent: 0, failed: 0, errors: ["No permission."] };
  }

  // Use service role to bypass RLS
  const admin = createServiceRoleSupabase();

  // Fetch cycle info
  const { data: cycle } = await admin
    .from("review_cycles")
    .select("title, self_review_due, status")
    .eq("id", cycleId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!cycle || cycle.status === "closed") {
    return { sent: 0, failed: 0, errors: ["Cycle not found or is closed."] };
  }

  // Fetch all pending self-reviews for this cycle
  const { data: selfReviews, error: srErr } = await admin
    .from("employee_self_reviews")
    .select("form_token, employee_id")
    .eq("review_cycle_id", cycleId)
    .eq("org_id", access.orgId)
    .eq("status", "pending");

  if (srErr) {
    return { sent: 0, failed: 0, errors: [`DB error: ${srErr.message}`] };
  }

  if (!selfReviews || selfReviews.length === 0) {
    return { sent: 0, failed: 0, errors: ["No pending submissions found. All employees may have already submitted."] };
  }

  // Build allowed employee ID set when filtering by teams
  // Employees table uses team_name (not team_id), so resolve names first
  let allowedEmployeeIds: Set<string> | null = null;
  if (teamIds.length > 0) {
    // Resolve team IDs → team names
    const { data: teamRows } = await admin
      .from("teams")
      .select("name")
      .in("id", teamIds)
      .eq("org_id", access.orgId);
    const teamNames = (teamRows ?? []).map((t) => t.name as string).filter(Boolean);

    if (teamNames.length > 0) {
      const { data: teamEmployees } = await admin
        .from("employees")
        .select("id")
        .eq("org_id", access.orgId)
        .in("team_name", teamNames);
      allowedEmployeeIds = new Set((teamEmployees ?? []).map((e) => e.id as string));
    }
  }

  const filteredReviews = allowedEmployeeIds
    ? selfReviews.filter((r) => allowedEmployeeIds!.has(r.employee_id as string))
    : selfReviews;

  if (filteredReviews.length === 0) {
    return { sent: 0, failed: 0, errors: ["No pending employees found for the selected team(s)."] };
  }

  const employeeIds = filteredReviews.map((r) => r.employee_id as string);

  // Fetch employee details
  const { data: employees } = await admin
    .from("employees")
    .select("id, name, email")
    .in("id", employeeIds)
    .eq("org_id", access.orgId);

  const employeeMap = new Map((employees ?? []).map((e) => [e.id, e]));
  const reviewMap = new Map(
    filteredReviews.map((r) => [r.employee_id as string, r.form_token as string]),
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const empId of employeeIds) {
    const emp = employeeMap.get(empId);
    const token = reviewMap.get(empId);
    if (!emp?.email || !token) {
      failed++;
      errors.push(`Missing email or token for employee ${empId}`);
      continue;
    }
    const result = await sendReviewFormEmail({
      to: emp.email,
      employeeName: emp.name,
      cycleTitle: (cycle.title as string) ?? "Performance Review",
      formToken: token,
      deadline: cycle.self_review_due as string | null,
    });
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${emp.name}: ${result.error}`);
    }
  }

  return { sent, failed, errors };
}
