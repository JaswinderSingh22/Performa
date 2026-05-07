import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { SelfReviewFormClient } from "@/components/reviews/self-review-form-client";
import { createServiceRoleSupabase } from "@/lib/supabase/admin";
import type { EmployeeSelfReviewRow, ReviewCycleRow, EmployeeRow } from "@/types/database";

type PageProps = Readonly<{ params: Promise<{ token: string }> }>;

export const dynamic = "force-dynamic";

export default async function PublicSelfReviewFormPage({
  params,
}: PageProps): Promise<ReactElement | null> {
  const { token } = await params;
  const admin = createServiceRoleSupabase();

  const { data: selfReview, error } = await admin
    .from("employee_self_reviews")
    .select("*, review_cycles(*), employees(id, name, email, employee_code, role, department, team_name)")
    .eq("form_token", token)
    .maybeSingle();

  if (error || !selfReview) notFound();

  const typedReview = selfReview as EmployeeSelfReviewRow & {
    review_cycles: ReviewCycleRow | null;
    employees: EmployeeRow | null;
  };

  if (!typedReview.review_cycles || !typedReview.employees) notFound();
  if (typedReview.review_cycles.status === "closed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="bg-muted mb-6 mx-auto flex size-16 items-center justify-center rounded-2xl text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-bold">This review is closed</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            The review cycle has been closed. No more submissions are accepted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SelfReviewFormClient
      token={token}
      selfReview={typedReview}
      cycle={typedReview.review_cycles}
      employee={typedReview.employees}
    />
  );
}
