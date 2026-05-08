import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  FilePenLineIcon,
  HourglassIcon,
  MailIcon,
  SendIcon,
  Users2Icon,
  XCircleIcon,
} from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { CycleActionButtons } from "@/components/reviews/cycle-action-buttons";
import { SendAllEmailsButton } from "@/components/reviews/send-all-emails-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getOrgAccess } from "@/lib/org-context";
import { normalizePlan } from "@/lib/plans";
import {
  coercePresetForPlan,
  labelForPreset,
  normalizeStoredPreset,
} from "@/lib/reviews/preset-review-templates";
import { normalizeWorkflowStatus } from "@/lib/reviews/workflow-status";
import type {
  EmployeeSelfReviewRow,
  ReviewCycleRow,
  ReviewManagerRemarksRow,
  ReviewWorkflowStatus,
} from "@/types/database";

type PageProps = Readonly<{ params: Promise<{ cycleId: string }> }>;

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function cycleScopeLabel(cycle: ReviewCycleRow): string {
  const names = cycle.scoped_team_names;
  if (!names || names.length === 0) return "All active employees";
  return names.join(", ");
}

function submissionBadge(status: EmployeeSelfReviewRow["status"]) {
  switch (status) {
    case "submitted":
      return (
        <Badge className="gap-1.5 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border text-xs font-medium">
          <CheckCircle2Icon className="size-3" />
          Submitted
        </Badge>
      );
    case "late":
      return (
        <Badge className="gap-1.5 bg-red-500/12 text-red-700 dark:text-red-400 border-red-500/20 border text-xs font-medium">
          <XCircleIcon className="size-3" />
          Late
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1.5 bg-muted/60 text-muted-foreground border-border/60 border text-xs font-medium">
          <ClockIcon className="size-3" />
          Pending
        </Badge>
      );
  }
}

function pipelineStatusBadge(wf: ReviewWorkflowStatus) {
  switch (wf) {
    case "finalized":
      return (
        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          Finalized
        </span>
      );
    case "hr_review_pending":
      return (
        <span className="text-violet-600 dark:text-violet-400 text-xs font-semibold">
          Awaiting HR
        </span>
      );
    case "revision_requested":
      return (
        <span className="text-amber-700 dark:text-amber-400 text-xs font-semibold">
          Revision
        </span>
      );
    case "employee_submitted":
      return (
        <span className="text-sky-600 dark:text-sky-400 text-xs font-semibold">
          With manager
        </span>
      );
    default:
      return (
        <span className="text-muted-foreground text-xs">Draft</span>
      );
  }
}

export default async function CycleDetailPage({
  params,
}: PageProps): Promise<ReactElement | null> {
  const { cycleId } = await params;
  const access = await getOrgAccess();
  if (!access) return null;

  const isAdminLike = access.role === "admin" || access.role === "hr";
  const isScoped = access.role === "manager" || access.role === "tl";

  // Load cycle
  const { data: cycle, error: cErr } = await access.supabase
    .from("review_cycles")
    .select("*")
    .eq("id", cycleId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (cErr || !cycle) notFound();
  const typedCycle = cycle as ReviewCycleRow;

  const { data: orgPlanRow } = await access.supabase
    .from("organizations")
    .select("plan")
    .eq("id", access.orgId)
    .maybeSingle();
  const workspacePlan = normalizePlan(orgPlanRow?.plan as string | null | undefined);
  const questionnaireLabel = labelForPreset(
    coercePresetForPlan(
      normalizeStoredPreset(typedCycle.self_review_template_preset),
      workspacePlan,
    ),
  );

  // Load self-reviews, scoped to the manager's teams if needed
  let selfReviewQuery = access.supabase
    .from("employee_self_reviews")
    .select("*, employees(id, name, email, employee_code, team_name, role)")
    .eq("review_cycle_id", cycleId)
    .eq("org_id", access.orgId);

  if (isScoped && access.employeeId) {
    const { data: myTeams } = await access.supabase
      .from("teams")
      .select("name")
      .eq("org_id", access.orgId)
      .eq("manager_employee_id", access.employeeId);
    const teamNames = (myTeams ?? []).map((t) => t.name as string);
    if (teamNames.length > 0) {
      // Filter by team via employees join
      selfReviewQuery = selfReviewQuery.in(
        "employees.team_name",
        teamNames,
      ) as typeof selfReviewQuery;
    }
  }

  const { data: selfReviewsRaw } = await selfReviewQuery.order("created_at", {
    ascending: true,
  });

  // Managers/TLs should not see their own self-review row in the cycle
  // (they manage their team, not review themselves from this view)
  const selfReviews = access.employeeId && isScoped
    ? (selfReviewsRaw ?? []).filter((r) => r.employee_id !== access.employeeId)
    : selfReviewsRaw;

  // Load teams for the "Send to all" team filter
  const { data: teamsData } = await access.supabase
    .from("teams")
    .select("id, name")
    .eq("org_id", access.orgId)
    .order("name", { ascending: true });
  const teams = (teamsData ?? []) as { id: string; name: string }[];

  // Load manager remarks (may be multiple reviewers per self-review; keep best row per packet)
  const { data: remarks } = await access.supabase
    .from("review_manager_remarks")
    .select("self_review_id, status, overall_rating, updated_at, submitted_at")
    .eq("review_cycle_id", cycleId)
    .eq("org_id", access.orgId);

  const priority = (r: { status: string }) =>
    r.status === "approved" ? 3 : r.status === "submitted" ? 2 : 1;

  const remarksBySelfReview = new Map<string, ReviewManagerRemarksRow>();
  for (const row of remarks ?? []) {
    const r = row as ReviewManagerRemarksRow;
    const sid = r.self_review_id as string;
    const prev = remarksBySelfReview.get(sid);
    if (!prev) {
      remarksBySelfReview.set(sid, r);
      continue;
    }
    const diff = priority(r) - priority(prev);
    if (diff > 0) {
      remarksBySelfReview.set(sid, r);
    } else if (diff === 0) {
      if (
        String(r.updated_at ?? "").localeCompare(String(prev.updated_at ?? "")) >
        0
      ) {
        remarksBySelfReview.set(sid, r);
      }
    }
  }

  const typedReviews = (selfReviews ?? []) as Array<
    EmployeeSelfReviewRow & {
      employees: {
        id: string;
        name: string;
        email: string;
        employee_code: string | null;
        team_name: string | null;
        role: string;
      } | null;
    }
  >;

  const totalCount = typedReviews.length;
  const submittedCount = typedReviews.filter(
    (r) => r.status === "submitted" || r.status === "late",
  ).length;
  const pendingCount = typedReviews.filter((r) => r.status === "pending").length;
  const awaitingHrCount = typedReviews.filter(
    (r) => normalizeWorkflowStatus(r) === "hr_review_pending",
  ).length;
  const finalizedCount = typedReviews.filter(
    (r) => normalizeWorkflowStatus(r) === "finalized",
  ).length;

  const visibleSelfReviewIds = new Set(typedReviews.map((r) => r.id));
  const withManagerRemarkCount = [...remarksBySelfReview.keys()].filter((id) =>
    visibleSelfReviewIds.has(id),
  ).length;

  return (
    <>
      <DashboardHeader
        title={typedCycle.title}
        description={`${new Date(typedCycle.period_start).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} – ${new Date(typedCycle.period_end).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} · ${typedCycle.cadence} · ${cycleScopeLabel(typedCycle)} · Form: ${questionnaireLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/reviews" className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}>
              <ArrowLeftIcon className="size-4" />
              All cycles
            </Link>
            {typedCycle.status === "open" && pendingCount > 0 && (
              <SendAllEmailsButton
                cycleId={cycleId}
                pendingCount={pendingCount}
                teams={teams}
              />
            )}
            {isAdminLike && (
              <CycleActionButtons cycle={typedCycle} />
            )}
          </div>
        }
      />

      <main className="flex-1 space-y-6 overflow-x-auto p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              icon: Users2Icon,
              label: "Total employees",
              value: totalCount,
              color: "text-sky-600 dark:text-sky-400",
              bg: "bg-sky-500/10",
            },
            {
              icon: SendIcon,
              label: "Submitted",
              value: submittedCount,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-500/10",
            },
            {
              icon: FilePenLineIcon,
              label: "With manager remarks",
              value: withManagerRemarkCount,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-500/10",
            },
            {
              icon: HourglassIcon,
              label: "Awaiting HR",
              value: awaitingHrCount,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-500/10",
            },
            {
              icon: CheckCircle2Icon,
              label: "Finalized",
              value: finalizedCount,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-500/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/65 bg-card p-4 shadow-sm"
            >
              <div
                className={`mb-2 flex size-9 items-center justify-center rounded-xl ${s.bg}`}
              >
                <s.icon className={`size-4.5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-muted-foreground text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Employee table */}
        {typedReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/10 py-16 text-center">
            <Users2Icon className="text-muted-foreground/40 mb-3 size-10" />
            <p className="text-muted-foreground text-sm">
              {typedCycle.status === "draft"
                ? "Open this cycle to create self-review forms for each employee in this cycle's scope."
                : "No employees found for this cycle."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/65 bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
              <h2 className="text-sm font-semibold">Employee submissions</h2>
            </div>
            <div className="divide-y divide-border/40">
              {typedReviews.map((sr) => {
                const emp = sr.employees;
                if (!emp) return null;
                const remark = remarksBySelfReview.get(sr.id);
                const wf = normalizeWorkflowStatus(sr);
                const canReview =
                  sr.status === "submitted" || sr.status === "late";

                return (
                  <div
                    key={sr.id}
                    className="flex items-center gap-4 px-4 py-3.5"
                  >
                    {/* Avatar */}
                    <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Employee info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{emp.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {emp.employee_code ? `${emp.employee_code} · ` : ""}
                        {sr.status === "submitted" || sr.status === "late"
                          ? sr.submitted_by_email ?? emp.email ?? "—"
                          : emp.email || emp.role || emp.team_name || "—"}
                      </p>
                    </div>

                    {/* Submission status */}
                    <div className="hidden sm:block">{submissionBadge(sr.status)}</div>

                    {/* Remarks status */}
                    <div className="hidden md:block min-w-[112px] text-right">
                      {pipelineStatusBadge(wf)}
                    </div>

                    {/* Rating */}
                    {remark?.overall_rating && (
                      <div className="hidden lg:flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        <span className="text-sm font-semibold">{remark.overall_rating}/5</span>
                      </div>
                    )}

                    {/* Action */}
                    <Link
                      href={`/reviews/${cycleId}/${emp.id}`}
                      className={buttonVariants({
                        variant:
                          canReview && wf !== "finalized" && !remark
                            ? "default"
                            : "outline",
                        size: "sm",
                        className: "shrink-0 text-xs",
                      })}
                    >
                      {wf === "finalized"
                        ? "View"
                        : remark || wf === "hr_review_pending"
                          ? "Open"
                          : canReview
                            ? "Review →"
                            : "View"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form link info */}
        {typedCycle.status === "open" && totalCount > 0 && (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="flex items-start gap-3">
              <MailIcon className="text-sky-500 mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">Self-review forms are live</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Each employee has a unique form link. Use <strong>Send to all</strong> to email all pending employees at once, or copy individual links from the employee table.
                  {typedCycle.self_review_due &&
                    ` Deadline: ${formatDate(typedCycle.self_review_due)}.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
