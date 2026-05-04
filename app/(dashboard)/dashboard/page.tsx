import type { ReactElement } from "react";
import Link from "next/link";

import type {
  LeaderboardSlice,
  RecentReviewRow,
  TeamSlice,
} from "@/components/dashboard/dashboard-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
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

type PublishedRatedRow = {
  employee_id: string;
  rating: number;
  employees: { name: string } | { name: string }[] | null;
};

export default async function DashboardPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;
  const orgId = access.orgId;

  const [
    employeeCountRes,
    reviewCountRes,
    achievementCountRes,
    noteCountRes,
    reviewsStatusRes,
    employeesTeamsRes,
    recentReviewsRes,
    publishedRatedRes,
  ] = await Promise.all([
    access.supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    access.supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    access.supabase
      .from("achievements")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    access.supabase
      .from("employee_notes")
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
      .select(`employee_id, rating, employees ( name )`)
      .eq("org_id", orgId)
      .eq("status", "published")
      .not("rating", "is", null),
  ]);

  const employeeCount = employeeCountRes.error ? 0 : employeeCountRes.count ?? 0;
  const reviewCount = reviewCountRes.error ? 0 : reviewCountRes.count ?? 0;
  const achievementCount = achievementCountRes.error
    ? 0
    : (achievementCountRes.count ?? 0);
  const noteCount = noteCountRes.error ? 0 : noteCountRes.count ?? 0;

  const reviewByStatus = { draft: 0, published: 0, archived: 0 };
  let pubRatingSum = 0;
  let publishedRatedReviewCount = 0;
  if (!reviewsStatusRes.error && reviewsStatusRes.data) {
    for (const row of reviewsStatusRes.data) {
      const s = row.status as keyof typeof reviewByStatus;
      if (s === "draft" || s === "published" || s === "archived") {
        reviewByStatus[s] += 1;
      }
      if (row.status === "published" && row.rating !== null && row.rating !== undefined) {
        pubRatingSum += row.rating;
        publishedRatedReviewCount += 1;
      }
    }
  }
  const avgRatingPublished =
    publishedRatedReviewCount > 0
      ? Math.round((pubRatingSum / publishedRatedReviewCount) * 10) / 10
      : null;

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

  /** Avg finalized review score per person (published + numeric rating only). */
  const agg = new Map<
    string,
    { sum: number; n: number; name: string }
  >();

  const pubRows =
    publishedRatedRes.error || !publishedRatedRes.data
      ? []
      : (publishedRatedRes.data as unknown as PublishedRatedRow[]);

  for (const row of pubRows) {
    const id = row.employee_id;
    const nm = embedEmployeeName(row.employees);
    const prev = agg.get(id);
    if (!prev) {
      agg.set(id, { sum: row.rating, n: 1, name: nm });
    } else {
      agg.set(id, {
        ...prev,
        sum: prev.sum + row.rating,
        n: prev.n + 1,
      });
    }
  }

  const leaderboard = [...agg.entries()]
    .map(([employeeId, v]) => ({
      employeeId,
      employeeName: v.name,
      avgRating: Math.round((v.sum / Math.max(v.n, 1)) * 10) / 10,
      reviewCount: v.n,
    }))
    .sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return a.employeeName.localeCompare(b.employeeName);
    });

  const topRated: LeaderboardSlice[] = leaderboard.slice(0, 3);
  const ascending = [...leaderboard].sort((a, b) => {
    if (a.avgRating !== b.avgRating) return a.avgRating - b.avgRating;
    return a.employeeName.localeCompare(b.employeeName);
  });
  const needsAttention: LeaderboardSlice[] = ascending.slice(0, 3);

  const analyticsProps = {
    employeeCount,
    reviewCount,
    achievementCount,
    noteCount,
    reviewByStatus,
    avgRating: avgRatingPublished,
    ratedReviewCount: publishedRatedReviewCount,
    teams,
    recentReviews,
    teamsError: Boolean(employeesTeamsRes.error),
    topRated,
    needsAttention,
  };

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Employees, finalized reviews & scores, achievements, and notes—each behaves differently."
        actions={
          <Button
            size="sm"
            className="rounded-lg shadow-sm"
            render={<Link href="/employees" />}
            nativeButton={false}
          >
            Employees
          </Button>
        }
      />
      <DashboardView {...analyticsProps} />
    </>
  );
}
