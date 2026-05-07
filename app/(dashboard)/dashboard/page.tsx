import type { ReactElement } from "react";

import type { RecentCycleRow, TeamSlice } from "@/components/dashboard/dashboard-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getOrgAccess } from "@/lib/org-context";

export default async function DashboardPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;
  const orgId = access.orgId;

  const [
    employeeCountRes,
    teamCountRes,
    departmentCountRes,
    cycleCountRes,
    employeesTeamsRes,
    recentCyclesRes,
    openSelfReviewsRes,
  ] = await Promise.all([
    access.supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    access.supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    access.supabase
      .from("departments")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    access.supabase
      .from("review_cycles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["open", "in_review"]),
    access.supabase.from("employees").select("team_name").eq("org_id", orgId),
    access.supabase
      .from("review_cycles")
      .select("id, title, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
    access.supabase
      .from("employee_self_reviews")
      .select("status")
      .eq("org_id", orgId),
  ]);

  const employeeCount = employeeCountRes.error ? 0 : (employeeCountRes.count ?? 0);
  const teamCount = teamCountRes.error ? 0 : (teamCountRes.count ?? 0);
  const departmentCount = departmentCountRes.error ? 0 : (departmentCountRes.count ?? 0);
  const activeCycleCount = cycleCountRes.error ? 0 : (cycleCountRes.count ?? 0);

  const teams: TeamSlice[] = [];
  if (!employeesTeamsRes.error && employeesTeamsRes.data) {
    const m = new Map<string, number>();
    for (const row of employeesTeamsRes.data) {
      const trimmed = row.team_name?.trim() ?? "";
      const label = trimmed.length > 0 ? trimmed : "Unassigned";
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [name, count] of sorted) {
      teams.push({ name, count });
    }
  }

  // Build recent cycles with submission counts
  const recentCycles: RecentCycleRow[] = [];
  if (!recentCyclesRes.error && recentCyclesRes.data) {
    const cycleIds = recentCyclesRes.data.map((c) => c.id);
    const submissionCounts: Record<string, { total: number; submitted: number }> = {};
    if (cycleIds.length > 0) {
      const { data: reviews } = await access.supabase
        .from("employee_self_reviews")
        .select("review_cycle_id, status")
        .in("review_cycle_id", cycleIds);
      if (reviews) {
        for (const r of reviews) {
          const cid = r.review_cycle_id as string;
          if (!submissionCounts[cid]) submissionCounts[cid] = { total: 0, submitted: 0 };
          submissionCounts[cid].total++;
          if (r.status === "submitted" || r.status === "under_review" || r.status === "approved") {
            submissionCounts[cid].submitted++;
          }
        }
      }
    }
    for (const c of recentCyclesRes.data) {
      const counts = submissionCounts[c.id] ?? { total: 0, submitted: 0 };
      recentCycles.push({
        id: c.id,
        title: c.title ?? "Untitled cycle",
        status: c.status as string,
        totalEmployees: counts.total,
        submitted: counts.submitted,
        createdAt: c.created_at,
      });
    }
  }

  // Submission progress across all open cycles
  let submittedCount = 0;
  let pendingCount = 0;
  if (!openSelfReviewsRes.error && openSelfReviewsRes.data) {
    for (const r of openSelfReviewsRes.data) {
      if (r.status === "submitted" || r.status === "under_review" || r.status === "approved") {
        submittedCount++;
      } else {
        pendingCount++;
      }
    }
  }

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Overview of your organisation's performance and review progress."
      />
      <DashboardView
        employeeCount={employeeCount}
        teamCount={teamCount}
        departmentCount={departmentCount}
        activeCycleCount={activeCycleCount}
        teams={teams}
        recentCycles={recentCycles}
        teamsError={Boolean(employeesTeamsRes.error)}
        submittedCount={submittedCount}
        pendingCount={pendingCount}
      />
    </>
  );
}

