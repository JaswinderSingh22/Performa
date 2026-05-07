import type { ReactElement } from "react";

import type {
  DepartmentSlice,
  OpenCycleProgress,
  OrgReviewTotals,
  PeopleHealth,
  RecentCycleRow,
  ReviewPipeline,
  TeamSlice,
} from "@/components/dashboard/dashboard-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getOrgAccess } from "@/lib/org-context";

/** Excluded from a team-lead dashboard roster (analytics only). Keep line managers who have TL/Mgr workspace access—they still report into the squad. */
const TEAM_ANALYTICS_EXCLUDED_WORKSPACE_ROLES = new Set(["admin", "hr"]);

function rollupRemarkStatus(raw: unknown): "none" | "draft" | "submitted" | "approved" {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const statuses = list
    .map((r) => (r as { status?: string }).status)
    .filter((s): s is string => Boolean(s));
  if (statuses.length === 0) return "none";
  if (statuses.some((s) => s === "approved")) return "approved";
  if (statuses.some((s) => s === "submitted")) return "submitted";
  if (statuses.some((s) => s === "draft")) return "draft";
  return "none";
}

/** When non-null: filter self-reviews to these employees only. Empty = no roster. */
async function resolveTeamAnalyticsContext(access: NonNullable<Awaited<ReturnType<typeof getOrgAccess>>>) {
  const orgId = access.orgId;
  const isTeamDashboard = access.role === "manager" || access.role === "tl";

  const { data: wmRows } = await access.supabase
    .from("workspace_members")
    .select("employee_id, role")
    .eq("org_id", orgId);

  const excludedFromTeamAnalyticsEmployeeIds = new Set<string>();
  for (const w of wmRows ?? []) {
    const r = (w.role as string) ?? "";
    if (TEAM_ANALYTICS_EXCLUDED_WORKSPACE_ROLES.has(r) && w.employee_id) {
      excludedFromTeamAnalyticsEmployeeIds.add(w.employee_id as string);
    }
  }

  if (!isTeamDashboard) {
    return {
      isTeamDashboard: false as const,
      analyticsEmployeeIds: null as string[] | null,
      ledTeamNames: [] as string[],
    };
  }

  let ledTeamNames: string[] = [];
  if (access.employeeId) {
    const { data: ledTeams } = await access.supabase
      .from("teams")
      .select("name")
      .eq("org_id", orgId)
      .eq("manager_employee_id", access.employeeId);
    ledTeamNames = (ledTeams ?? []).map((t) => t.name as string);
  }

  if (ledTeamNames.length === 0) {
    return {
      isTeamDashboard: true as const,
      analyticsEmployeeIds: [] as string[],
      ledTeamNames,
    };
  }

  const { data: inTeam } = await access.supabase
    .from("employees")
    .select("id")
    .eq("org_id", orgId)
    .in("team_name", ledTeamNames);

  const analyticsEmployeeIds = (inTeam ?? [])
    .map((e) => e.id as string)
    .filter(
      (id) =>
        (!access.employeeId || id !== access.employeeId) &&
        !excludedFromTeamAnalyticsEmployeeIds.has(id),
    );

  return {
    isTeamDashboard: true as const,
    analyticsEmployeeIds,
    ledTeamNames,
  };
}

export default async function DashboardPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;
  const orgId = access.orgId;
  const isAdminOrHr = access.role === "admin" || access.role === "hr";

  const teamCtx = await resolveTeamAnalyticsContext(access);
  const analyticsIds = teamCtx.analyticsEmployeeIds;

  const emptyTeamScoped =
    teamCtx.isTeamDashboard && analyticsIds !== null && analyticsIds.length === 0;

  const [
    recentCyclesRes,
    openCyclesRes,
    draftCyclesCountRes,
    pendingInvitesRes,
    cycleCountRes,
  ] = await Promise.all([
    access.supabase
      .from("review_cycles")
      .select("id, title, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
    access.supabase
      .from("review_cycles")
      .select("id, title, self_review_due")
      .eq("org_id", orgId)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    isAdminOrHr
      ? access.supabase
          .from("review_cycles")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", "draft")
      : Promise.resolve({ count: 0 as number | null, error: null }),
    isAdminOrHr
      ? access.supabase
          .from("workspace_members")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .not("invited_at", "is", null)
          .is("joined_at", null)
      : Promise.resolve({ count: null as number | null, error: null }),
    access.supabase
      .from("review_cycles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["open", "in_review"]),
  ]);

  let employeeCount = 0;
  let activeEmployees = 0;
  let inactiveEmployees = 0;
  let teamCount = 0;
  let departmentCount = 0;
  const teams: TeamSlice[] = [];
  const departments: DepartmentSlice[] = [];
  let unassignedTeam = 0;
  let unassignedDepartment = 0;
  let employeesTeamsErr = false;
  let employeesDeptErr = false;

  if (!teamCtx.isTeamDashboard) {
    const [
      employeeCountRes,
      activeEmployeeCountRes,
      inactiveEmployeeCountRes,
      teamCountRes,
      departmentCountRes,
      employeesTeamsRes,
      employeesDepartmentRes,
    ] = await Promise.all([
      access.supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      access.supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_active", true),
      access.supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_active", false),
      access.supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      access.supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      access.supabase.from("employees").select("team_name").eq("org_id", orgId),
      access.supabase.from("employees").select("department").eq("org_id", orgId),
    ]);

    employeeCount = employeeCountRes.error ? 0 : (employeeCountRes.count ?? 0);
    activeEmployees = activeEmployeeCountRes.error ? employeeCount : (activeEmployeeCountRes.count ?? 0);
    inactiveEmployees = inactiveEmployeeCountRes.error ? 0 : (inactiveEmployeeCountRes.count ?? 0);
    teamCount = teamCountRes.error ? 0 : (teamCountRes.count ?? 0);
    departmentCount = departmentCountRes.error ? 0 : (departmentCountRes.count ?? 0);
    employeesTeamsErr = Boolean(employeesTeamsRes.error);
    employeesDeptErr = Boolean(employeesDepartmentRes.error);

    if (!employeesTeamsRes.error && employeesTeamsRes.data) {
      const m = new Map<string, number>();
      for (const row of employeesTeamsRes.data) {
        const trimmed = row.team_name?.trim() ?? "";
        const label = trimmed.length > 0 ? trimmed : "Unassigned";
        if (label === "Unassigned") unassignedTeam += 1;
        m.set(label, (m.get(label) ?? 0) + 1);
      }
      const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      for (const [name, count] of sorted) teams.push({ name, count });
    }

    if (!employeesDepartmentRes.error && employeesDepartmentRes.data) {
      const m = new Map<string, number>();
      for (const row of employeesDepartmentRes.data) {
        const trimmed = row.department?.trim() ?? "";
        const label = trimmed.length > 0 ? trimmed : "Unassigned";
        if (label === "Unassigned") unassignedDepartment += 1;
        m.set(label, (m.get(label) ?? 0) + 1);
      }
      const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      for (const [name, count] of sorted) departments.push({ name, count });
    }
  } else if (emptyTeamScoped) {
    employeeCount = 0;
    activeEmployees = 0;
    inactiveEmployees = 0;
    teamCount = teamCtx.ledTeamNames.length;
    departmentCount = 0;
  } else {
    teamCount = teamCtx.ledTeamNames.length;

    const { data: roster, error: rosterErr } = await access.supabase
      .from("employees")
      .select("id, is_active, team_name, department")
      .eq("org_id", orgId)
      .in("id", analyticsIds ?? []);

    if (rosterErr) {
      employeesTeamsErr = true;
      employeesDeptErr = true;
    } else {
      const rows = roster ?? [];
      employeeCount = rows.length;
      activeEmployees = rows.filter((r) => r.is_active !== false).length;
      inactiveEmployees = rows.filter((r) => r.is_active === false).length;

      const deptNameByTeamName = new Map<string, string>();
      const rosterTeamNames = [
        ...new Set(
          rows
            .map((r) => r.team_name?.trim() ?? "")
            .filter((n) => n.length > 0),
        ),
      ];
      if (rosterTeamNames.length > 0) {
        const { data: teamDeptRows } = await access.supabase
          .from("teams")
          .select("name, departments(name)")
          .eq("org_id", orgId)
          .in("name", rosterTeamNames);
        for (const t of teamDeptRows ?? []) {
          const tn = (t.name as string)?.trim();
          const depRaw = t.departments as { name?: string } | { name?: string }[] | null | undefined;
          const dep = Array.isArray(depRaw) ? depRaw[0] : depRaw;
          const d = dep?.name?.trim();
          if (tn && d) deptNameByTeamName.set(tn, d);
        }
      }

      function rosterDeptLabel(r: {
        department?: string | null;
        team_name?: string | null;
      }): string {
        const fromEmp = r.department?.trim() ?? "";
        if (fromEmp) return fromEmp;
        const tn = r.team_name?.trim() ?? "";
        return tn ? (deptNameByTeamName.get(tn) ?? "").trim() : "";
      }

      const depts = new Set(
        rows.map(rosterDeptLabel).filter((d): d is string => d.length > 0),
      );
      departmentCount = depts.size;

      const tm = new Map<string, number>();
      for (const row of rows) {
        const trimmed = row.team_name?.trim() ?? "";
        const label = trimmed.length > 0 ? trimmed : "Unassigned";
        if (label === "Unassigned") unassignedTeam += 1;
        tm.set(label, (tm.get(label) ?? 0) + 1);
      }
      const sortedT = [...tm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      for (const [name, count] of sortedT) teams.push({ name, count });

      const dm = new Map<string, number>();
      for (const row of rows) {
        const trimmed = rosterDeptLabel(row);
        const label = trimmed.length > 0 ? trimmed : "Unassigned";
        if (label === "Unassigned") unassignedDepartment += 1;
        dm.set(label, (dm.get(label) ?? 0) + 1);
      }
      const sortedD = [...dm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      for (const [name, count] of sortedD) departments.push({ name, count });
    }
  }

  const draftCyclesCount =
    isAdminOrHr && !draftCyclesCountRes.error ? (draftCyclesCountRes.count ?? 0) : 0;
  const pendingWorkspaceInvites =
    isAdminOrHr && !pendingInvitesRes.error ? (pendingInvitesRes.count ?? 0) : 0;
  const activeCycleCount = cycleCountRes.error ? 0 : (cycleCountRes.count ?? 0);

  const peopleHealth: PeopleHealth = {
    activeEmployees,
    inactiveEmployees,
    unassignedTeam,
    unassignedDepartment,
    pendingWorkspaceInvites,
    draftCycles: draftCyclesCount,
  };

  const skipEsrScoped = analyticsIds !== null && analyticsIds.length === 0;

  // Recent cycles
  const recentCycles: RecentCycleRow[] = [];
  if (!recentCyclesRes.error && recentCyclesRes.data) {
    const cycleIds = recentCyclesRes.data.map((c) => c.id);
    const submissionCounts: Record<string, { total: number; submitted: number }> = {};
    if (cycleIds.length > 0 && !skipEsrScoped) {
      let rq = access.supabase
        .from("employee_self_reviews")
        .select("review_cycle_id, status")
        .in("review_cycle_id", cycleIds)
        .eq("org_id", orgId);
      if (analyticsIds !== null && analyticsIds.length > 0) {
        rq = rq.in("employee_id", analyticsIds);
      }
      const { data: reviews } = await rq;
      if (reviews) {
        for (const r of reviews) {
          const cid = r.review_cycle_id as string;
          if (!submissionCounts[cid]) submissionCounts[cid] = { total: 0, submitted: 0 };
          submissionCounts[cid].total++;
          if (r.status === "submitted") {
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

  const openCycleProgress: OpenCycleProgress[] = [];
  const reviewTotals: OrgReviewTotals = { submitted: 0, pending: 0, total: 0 };
  const pipeline: ReviewPipeline = {
    needManagerInput: 0,
    awaitingApproval: 0,
    approved: 0,
  };

  if (!skipEsrScoped && !openCyclesRes.error && openCyclesRes.data && openCyclesRes.data.length > 0) {
    const openCycleIds = openCyclesRes.data.map((c) => c.id);

    let oq = access.supabase
      .from("employee_self_reviews")
      .select("review_cycle_id, status")
      .in("review_cycle_id", openCycleIds)
      .eq("org_id", orgId);
    if (analyticsIds !== null && analyticsIds.length > 0) {
      oq = oq.in("employee_id", analyticsIds);
    }
    const { data: openReviews } = await oq;

    const countsByCycle: Record<string, { total: number; submitted: number; pending: number }> =
      {};
    for (const r of openReviews ?? []) {
      const cid = r.review_cycle_id as string;
      if (!countsByCycle[cid]) countsByCycle[cid] = { total: 0, submitted: 0, pending: 0 };
      countsByCycle[cid].total++;
      if (r.status === "submitted") countsByCycle[cid].submitted++;
      else countsByCycle[cid].pending++;
    }

    for (const c of openCyclesRes.data) {
      const counts = countsByCycle[c.id] ?? { total: 0, submitted: 0, pending: 0 };
      openCycleProgress.push({
        id: c.id,
        title: c.title ?? "Untitled cycle",
        due: c.self_review_due as string | null,
        total: counts.total,
        submitted: counts.submitted,
        pending: counts.pending,
      });
      reviewTotals.submitted += counts.submitted;
      reviewTotals.pending += counts.pending;
      reviewTotals.total += counts.total;
    }

    let sq = access.supabase
      .from("employee_self_reviews")
      .select("id, review_manager_remarks(status)")
      .in("review_cycle_id", openCycleIds)
      .eq("org_id", orgId)
      .eq("status", "submitted");
    if (analyticsIds !== null && analyticsIds.length > 0) {
      sq = sq.in("employee_id", analyticsIds);
    }
    const { data: submittedRows } = await sq;

    for (const row of submittedRows ?? []) {
      const st = rollupRemarkStatus(row.review_manager_remarks);
      if (st === "none" || st === "draft") {
        pipeline.needManagerInput++;
      } else if (st === "submitted") {
        pipeline.awaitingApproval++;
      } else if (st === "approved") {
        pipeline.approved++;
      }
    }
  }

  let visibleOpenProgress = openCycleProgress;
  if (teamCtx.isTeamDashboard && !skipEsrScoped) {
    visibleOpenProgress = openCycleProgress.filter((c) => c.total > 0);
  }

  const headerDescription = teamCtx.isTeamDashboard
    ? teamCtx.ledTeamNames.length > 0
      ? `Review progress for ${teamCtx.ledTeamNames.join(", ")} — counts include your team roster (excluding Admin/HR roles and your own row).`
      : "You don’t lead any teams yet; ask your admin to assign you as manager on teams."
    : "Overview of your organisation's performance and review progress.";

  return (
    <>
      <DashboardHeader
        title={teamCtx.isTeamDashboard ? "Team dashboard" : "Dashboard"}
        description={headerDescription}
      />
      <DashboardView
        employeeCount={employeeCount}
        teamCount={teamCount}
        departmentCount={departmentCount}
        activeCycleCount={activeCycleCount}
        teams={teams}
        departments={departments}
        recentCycles={recentCycles}
        teamsError={employeesTeamsErr}
        departmentsError={employeesDeptErr}
        openCycleProgress={visibleOpenProgress}
        orgReviewTotals={reviewTotals}
        reviewPipeline={pipeline}
        peopleHealth={peopleHealth}
        showAdminInsights={isAdminOrHr}
        dashboardMode={teamCtx.isTeamDashboard ? "team" : "org"}
      />
    </>
  );
}
