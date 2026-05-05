import type { ReactElement } from "react";

import type {
  OrgTopRanking,
  RecentReviewRow,
  TeamSlice,
} from "@/components/dashboard/dashboard-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getOrgAccess } from "@/lib/org-context";

type DbReviewEmbed = {
  id: string;
  title: string | null;
  status: RecentReviewRow["status"];
  rating: number | null;
  created_at: string;
  employee_id: string;
  employees: { name: string } | { name: string }[] | null;
};

function embedEmployeeName(
  rel: DbReviewEmbed["employees"],
): string {
  if (!rel) return "Employee";
  if (Array.isArray(rel)) {
    const n = rel[0]?.name;
    return typeof n === "string" && n.trim() ? n : "Employee";
  }
  return rel.name?.trim() ? rel.name : "Employee";
}

type OrgRatedRow = {
  rating: number;
  employees:
    | { name: string | null; team_name: string | null; department: string | null }
    | { name: string | null; team_name: string | null; department: string | null }[]
    | null;
};

export default async function DashboardPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;
  const orgId = access.orgId;

  const [
    employeeCountRes,
    teamCountRes,
    departmentCountRes,
    reviewCountRes,
    reviewsStatusRes,
    employeesTeamsRes,
    recentReviewsRes,
    orgRatedRes,
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
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    access.supabase
      .from("reviews")
      .select("status, rating")
      .eq("org_id", orgId),
    access.supabase.from("employees").select("team_name").eq("org_id", orgId),
    access.supabase
      .from("reviews")
      .select(
        "id, title, status, rating, created_at, employee_id, employees ( name )",
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
    access.supabase
      .from("reviews")
      .select(`rating, employees ( name, team_name, department )`)
      .eq("org_id", orgId)
      .not("rating", "is", null),
  ]);

  const employeeCount = employeeCountRes.error ? 0 : employeeCountRes.count ?? 0;
  const teamCount = teamCountRes.error ? 0 : teamCountRes.count ?? 0;
  const departmentCount = departmentCountRes.error ? 0 : departmentCountRes.count ?? 0;
  const reviewCount = reviewCountRes.error ? 0 : reviewCountRes.count ?? 0;

  let ratedReviewCount = 0;
  if (!reviewsStatusRes.error && reviewsStatusRes.data) {
    for (const row of reviewsStatusRes.data) {
      if (row.rating !== null && row.rating !== undefined) {
        ratedReviewCount += 1;
      }
    }
  }
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

  const recentReviews: RecentReviewRow[] =
    recentReviewsRes.error || !recentReviewsRes.data
      ? []
      : (recentReviewsRes.data as unknown as DbReviewEmbed[]).map((r) => ({
          id: r.id,
          employeeId: r.employee_id,
          employeeName: embedEmployeeName(r.employees),
          title: r.title,
          status: r.status,
          rating: r.rating,
          createdAt: r.created_at,
        }));

  const ratedRows =
    orgRatedRes.error || !orgRatedRes.data
      ? []
      : (orgRatedRes.data as unknown as OrgRatedRow[]);

  const teamAgg = new Map<string, { sum: number; count: number }>();
  const employeeAgg = new Map<string, { sum: number; count: number }>();
  const departmentAgg = new Map<string, { sum: number; count: number }>();

  for (const row of ratedRows) {
    const rel = Array.isArray(row.employees) ? relFromArray(row.employees) : row.employees;
    const team = rel?.team_name?.trim() || "Unassigned";
    const employee = rel?.name?.trim() || "Unknown";
    const department = rel?.department?.trim() || "Unassigned";
    incrementAgg(teamAgg, team, row.rating);
    incrementAgg(employeeAgg, employee, row.rating);
    incrementAgg(departmentAgg, department, row.rating);
  }

  const topTeams = toTopRankings(teamAgg, 3);
  const topEmployees = toTopRankings(employeeAgg, 3);
  const topDepartments = toTopRankings(departmentAgg, 3);

  const analyticsProps = {
    employeeCount,
    teamCount,
    departmentCount,
    reviewCount,
    ratedReviewCount,
    teams,
    recentReviews,
    teamsError: Boolean(employeesTeamsRes.error),
    topTeams,
    topEmployees,
    topDepartments,
  };

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Organisation-level snapshot across teams, departments, and review quality."
      />
      <DashboardView {...analyticsProps} />
    </>
  );
}

function relFromArray(
  rel: { name: string | null; team_name: string | null; department: string | null }[],
): { name: string | null; team_name: string | null; department: string | null } | null {
  return rel[0] ?? null;
}

function incrementAgg(
  map: Map<string, { sum: number; count: number }>,
  key: string,
  value: number,
): void {
  const prev = map.get(key);
  if (!prev) {
    map.set(key, { sum: value, count: 1 });
    return;
  }
  map.set(key, { sum: prev.sum + value, count: prev.count + 1 });
}

function toTopRankings(
  map: Map<string, { sum: number; count: number }>,
  limit: number,
): OrgTopRanking[] {
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      avgRating: Math.round((v.sum / v.count) * 10) / 10,
      reviewCount: v.count,
    }))
    .sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
