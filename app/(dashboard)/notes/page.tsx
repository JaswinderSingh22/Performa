import type { ReactElement } from "react";
import Link from "next/link";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card } from "@/components/ui/card";
import { getOrgAccess } from "@/lib/org-context";
import { embedEmployeeName } from "@/lib/embed-employee-name";

type NoteRow = {
  id: string;
  body: string;
  created_at: string;
  employee_id: string;
  employees: { name: string } | { name: string }[] | null;
};

export default async function WorkspaceNotesPage(): Promise<ReactElement | null> {
  const access = await getOrgAccess();
  if (!access) return null;

  const { data, error } = await access.supabase
    .from("employee_notes")
    .select("id, body, created_at, employee_id, employees ( name )")
    .eq("org_id", access.orgId)
    .order("created_at", { ascending: false })
    .limit(120);

  const rows = !error ? ((data ?? []) as unknown as NoteRow[]) : [];

  return (
    <>
      <DashboardHeader
        title="Notes"
        description="Manager notes across the workspace, newest first."
      />
      <main className="flex-1 overflow-x-auto p-6">
        {rows.length === 0 ? (
          <Card className="border-border/70 mx-auto mt-10 max-w-lg p-10 text-center shadow-md">
            <p className="text-muted-foreground text-sm leading-relaxed">
              No notes logged yet. Add context from each profile’s Notes tab.
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
              const preview =
                row.body.trim().length > 180
                  ? `${row.body.trim().slice(0, 180)}…`
                  : row.body.trim();
              return (
                <li key={row.id}>
                  <Link
                    href={`/employees/${row.employee_id}/insights`}
                    className="hover:bg-muted/48 block px-4 py-4 transition-colors md:px-5"
                  >
                    <p className="text-foreground text-sm leading-relaxed">
                      {preview}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {name}
                      <span className="mx-1.5 opacity-40">·</span>
                      {new Date(row.created_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
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
