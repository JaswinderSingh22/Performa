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
 * Send review form email(s) to a single employee.
 * If the employee has multiple open cycles pending, sends one email per cycle.
 * Allowed for: admin, hr, manager, tl
 */
export async function sendReviewEmailAction(
  employeeId: string,
): Promise<SendResult & { cyclesSent?: number }> {
  const access = await getOrgAccess();
  if (!access) return { success: false, error: "Not authenticated." };

  const allowedRoles = ["admin", "hr", "manager", "tl"];
  if (!access.role || !allowedRoles.includes(access.role)) {
    return { success: false, error: "You don't have permission to send review invites." };
  }

  const admin = createServiceRoleSupabase();

  const { data: employee } = await admin
    .from("employees")
    .select("name, email, team_name")
    .eq("id", employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!employee?.email) {
    return { success: false, error: "Employee email not found." };
  }

  if (access.role === "manager" || access.role === "tl") {
    if (!access.employeeId) {
      return { success: false, error: "Your account must be linked to an employee profile." };
    }
    if (employeeId === access.employeeId) {
      return {
        success: false,
        error: "You cannot send yourself a reminder from here — open your review link directly.",
      };
    }
    const { data: ledTeams } = await admin
      .from("teams")
      .select("name")
      .eq("org_id", access.orgId)
      .eq("manager_employee_id", access.employeeId);
    const ledNames = new Set(
      (ledTeams ?? []).map((t) => (t.name as string).trim()).filter(Boolean),
    );
    const reportTeam = (employee.team_name as string | null | undefined)?.trim() ?? "";
    if (!reportTeam || !ledNames.has(reportTeam)) {
      return {
        success: false,
        error: "You can only send reminders to employees on teams you manage.",
      };
    }
  }

  // Find ALL pending self-reviews for this employee (could be multiple open cycles)
  const { data: selfReviews } = await admin
    .from("employee_self_reviews")
    .select("form_token, review_cycle_id")
    .eq("employee_id", employeeId)
    .eq("org_id", access.orgId)
    .eq("status", "pending");

  if (!selfReviews || selfReviews.length === 0) {
    return { success: false, error: "No pending review forms found for this employee. They may have already submitted all reviews.", employeeName: employee.name };
  }

  // Fetch cycle info for each pending review
  const cycleIds = selfReviews.map((r) => r.review_cycle_id as string);
  const { data: cycles } = await admin
    .from("review_cycles")
    .select("id, title, self_review_due, status")
    .in("id", cycleIds)
    .eq("org_id", access.orgId)
    .eq("status", "open");

  if (!cycles || cycles.length === 0) {
    return { success: false, error: "No open cycles found for this employee.", employeeName: employee.name };
  }

  const cycleMap = new Map(cycles.map((c) => [c.id as string, c]));
  let cyclesSent = 0;
  const errs: string[] = [];

  for (const sr of selfReviews) {
    const cycle = cycleMap.get(sr.review_cycle_id as string);
    if (!cycle || !sr.form_token) continue;
    const result = await sendReviewFormEmail({
      to: employee.email,
      employeeName: employee.name,
      cycleTitle: (cycle.title as string) ?? "Performance Review",
      formToken: sr.form_token as string,
      deadline: cycle.self_review_due as string | null,
    });
    if (result.success) cyclesSent++;
    else errs.push(result.error ?? "Unknown error");
  }

  if (cyclesSent === 0) {
    return { success: false, error: errs.join("; "), employeeName: employee.name };
  }
  return { success: true, employeeName: employee.name, cyclesSent };
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

  let filteredReviews = allowedEmployeeIds
    ? selfReviews.filter((r) => allowedEmployeeIds!.has(r.employee_id as string))
    : selfReviews;

  // Managers / TLs: never email the whole cycle — only people in teams they lead,
  // and never their own self-review row (they fill that outside this flow).
  const isLineManager = access.role === "manager" || access.role === "tl";
  if (isLineManager) {
    if (!access.employeeId) {
      return {
        sent: 0,
        failed: 0,
        errors: ["Your account is not linked to an employee record."],
      };
    }
    const { data: ledTeams } = await admin
      .from("teams")
      .select("name")
      .eq("org_id", access.orgId)
      .eq("manager_employee_id", access.employeeId);
    const ledNames = (ledTeams ?? []).map((t) => t.name as string).filter(Boolean);
    if (ledNames.length === 0) {
      return {
        sent: 0,
        failed: 0,
        errors: ["You are not assigned as manager of any team."],
      };
    }
    const { data: ledEmps } = await admin
      .from("employees")
      .select("id")
      .eq("org_id", access.orgId)
      .in("team_name", ledNames);
    const managedIds = new Set((ledEmps ?? []).map((e) => e.id as string));
    filteredReviews = filteredReviews.filter(
      (r) =>
        managedIds.has(r.employee_id as string) &&
        r.employee_id !== access.employeeId,
    );
  }

  if (filteredReviews.length === 0) {
    return {
      sent: 0,
      failed: 0,
      errors: [
        isLineManager
          ? "No pending direct reports to email for this selection."
          : "No pending employees found for the selected team(s).",
      ],
    };
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
