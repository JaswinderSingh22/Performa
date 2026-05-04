import { notFound } from "next/navigation";

import { EmployeeProfileTabs } from "@/components/employees/employee-profile-tabs";
import { getOrgAccess } from "@/lib/org-context";
import type { AchievementRow } from "@/types/database";
import type { EmployeeNoteRow } from "@/types/database";
import type { EmployeeRow } from "@/types/database";
import type { ReviewWithDimensions } from "@/types/database";

type PageProps = Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}>;

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement | null> {
  const { id } = await params;
  const sp = searchParams !== undefined ? await searchParams : {};
  const access = await getOrgAccess();
  if (!access) return null;

  const { data: employee, error: employeeError } = await access.supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (employeeError || !employee) {
    notFound();
  }

  const employeeRow = employee as EmployeeRow;

  const [achievementsRes, reviewsRes, notesRes] = await Promise.all([
    access.supabase
      .from("achievements")
      .select("*")
      .eq("employee_id", id)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false }),
    access.supabase
      .from("reviews")
      .select(
        `
        *,
        review_dimensions (
          id,
          review_id,
          org_id,
          label,
          analysis,
          rating,
          sort_order,
          created_at
        )
      `,
      )
      .eq("employee_id", id)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false }),
    access.supabase
      .from("employee_notes")
      .select("*")
      .eq("employee_id", id)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <EmployeeProfileTabs
      employee={employeeRow}
      achievements={(achievementsRes.data ?? []) as AchievementRow[]}
      notes={(notesRes.data ?? []) as EmployeeNoteRow[]}
      reviews={(reviewsRes.data ?? []) as ReviewWithDimensions[]}
      initialTab={sp.tab}
    />
  );
}
