import type { ReactElement } from "react";
import Link from "next/link";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getOrgAccess } from "@/lib/org-context";
import { embedEmployeeName } from "@/lib/embed-employee-name";

type AchRow = {
  id: string;
  title: string;
  category: string;
  achievement_date: string | null;
  created_at: string;
  employee_id: string;
  employees: { name: string } | { name: string }[] | null;
};

export default async function WorkspaceAchievementsPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const { data, error } = await access.supabase
    .from("achievements")
    .select(
      "id, title, category, achievement_date, created_at, employee_id, employees ( name )",
    )
    .eq("org_id", access.orgId)
    .order("created_at", { ascending: false })
    .limit(120);

  const rows = !error ? ((data ?? []) as unknown as AchRow[]) : [];

  return (
    <>
      <DashboardHeader
        title="Achievements"
        description="Recent wins logged for your team—deep-link into any profile."
      />
      <main className="flex-1 overflow-x-auto p-6">
        {rows.length === 0 ? (
          <Card className="border-border/70 mx-auto mt-10 max-w-lg p-10 text-center shadow-md">
            <p className="text-muted-foreground text-sm leading-relaxed">
              No achievements yet. Capture outcomes from each profile’s
              Achievements tab.
            </p>
            <Link
              href="/employees"
              className="text-primary mt-6 inline-block text-sm font-medium"
            >
              Go to employees
            </Link>
          </Card>
        ) : (
          <ul className="divide-border/70 mx-auto mt-6 max-w-3xl divide-y rounded-2xl border border-border/70 bg-card/50 shadow-lg backdrop-blur-sm">
            {rows.map((row) => {
              const name = embedEmployeeName(row.employees);
              const when =
                row.achievement_date ??
                new Date(row.created_at).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                });
              return (
                <li key={row.id}>
                  <Link
                    href={`/employees/${row.employee_id}?tab=achievements`}
                    className="hover:bg-muted/48 block px-4 py-4 transition-colors md:px-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-foreground font-medium">{row.title}</p>
                      <Badge variant="secondary" className="font-normal">
                        {row.category}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {name}
                      <span className="mx-1.5 opacity-40">·</span>
                      {when}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
