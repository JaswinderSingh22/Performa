import type { ReactElement } from "react";
import Link from "next/link";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card } from "@/components/ui/card";
import {
  ReviewsWorkspaceList,
  type WorkspaceReviewRow,
} from "@/components/reviews/reviews-workspace-list";
import { embedEmployeeName } from "@/lib/embed-employee-name";
import { getOrgAccess } from "@/lib/org-context";
import type { ReviewStatus } from "@/types/database";

type ReviewRowRaw = {
  id: string;
  title: string | null;
  status: ReviewStatus;
  rating: number | null;
  created_at: string;
  employee_id: string;
  employees: { name: string } | { name: string }[] | null;
};

export default async function WorkspaceReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ highlight?: string }>;
}): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const sp = searchParams ? await searchParams : {};
  const highlightRaw = typeof sp.highlight === "string" ? sp.highlight : null;

  const { data, error } = await access.supabase
    .from("reviews")
    .select(
      "id, title, status, rating, created_at, employee_id, employees ( name )",
    )
    .eq("org_id", access.orgId)
    .is("generation_strategy", null)
    .order("created_at", { ascending: false })
    .limit(120);

  const rawRows = !error ? ((data ?? []) as unknown as ReviewRowRaw[]) : [];

  const rows: WorkspaceReviewRow[] = rawRows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    rating: row.rating,
    created_at: row.created_at,
    employee_id: row.employee_id,
    employeeName: embedEmployeeName(row.employees),
  }));

  const highlight =
    highlightRaw !== null &&
    highlightRaw.trim().length > 0 &&
    rows.some((r) => r.id === highlightRaw.trim())
      ? highlightRaw.trim()
      : null;

  return (
    <>
      <DashboardHeader
        title="Reviews"
        description="Standalone performance reviews across your workspace—from drafts through finalized summaries."
        actions={
          <Link
            href="/employees"
            className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-sm underline-offset-4 transition-colors hover:underline"
          >
            Employee directory →
          </Link>
        }
      />
      <main className="flex-1 overflow-x-auto p-6 pb-14">
        {rows.length === 0 ? (
          <Card className="border-border/70 mx-auto mt-10 max-w-lg p-10 text-center shadow-md">
            <p className="text-muted-foreground text-sm leading-relaxed">
              No reviews yet. Open someone&apos;s profile → Reviews to start a
              checklist-backed review; finalize only when leadership is aligned.
            </p>
            <Link
              href="/employees"
              className="text-primary mt-6 inline-block text-sm font-medium"
            >
              Go to employees
            </Link>
          </Card>
        ) : (
          <ReviewsWorkspaceList rows={rows} highlight={highlight} />
        )}
      </main>
    </>
  );
}
