"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
import { normalizePlan } from "@/lib/plans";
import {
  definitionForCyclePresetAndPlan,
  presetAvailableOnPlan,
  type ReviewTemplatePresetId,
} from "@/lib/reviews/preset-review-templates";
import {
  normalizeDepartmentKey,
  validateSelfReviewPayloadAgainstDefinition,
} from "@/lib/reviews/review-template-definition";
import { createServiceRoleSupabase } from "@/lib/supabase/admin";
import type { ReviewCadence } from "@/types/database";

export type CycleActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function revalidateCycleSurfaces(cycleId?: string) {
  revalidatePath("/reviews");
  if (cycleId) {
    revalidatePath(`/reviews/${cycleId}`);
  }
}

// ─── Validators ──────────────────────────────────────────────────────────────

const createCycleSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    cadence: z.enum(["monthly", "quarterly", "mid_year", "yearly"]),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    self_review_due: z
      .string()
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
      .pipe(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional(),
      ),
    scope_entire_org: z.boolean(),
    scoped_team_names: z.array(z.string().trim().min(1)).max(80).default([]),
    scoped_department_ids: z.array(z.string().uuid()).max(80).default([]),
    review_template_preset: z.enum([
      "general",
      "engineering",
      "sales",
      "customer_success",
      "leadership",
    ]),
  })
  .superRefine((data, ctx) => {
    if (!data.scope_entire_org) {
      const teams = data.scoped_team_names?.length ?? 0;
      const depts = data.scoped_department_ids?.length ?? 0;
      if (teams === 0 && depts === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select at least one team or department, or include the entire workspace.",
          path: ["scoped_team_names"],
        });
      }
    }
  });

const openCycleSchema = z.object({ cycleId: z.uuid() });
const closeCycleSchema = z.object({ cycleId: z.uuid() });
const deleteCycleSchema = z.object({ cycleId: z.uuid() });

// ─── Actions ─────────────────────────────────────────────────────────────────

async function ensureAdminOrHr(): Promise<
  | { ok: true; access: Awaited<ReturnType<typeof getOrgAccess>> & object; userId: string }
  | { ok: false; error: string }
> {
  const access = await getOrgAccess();
  if (!access) return { ok: false, error: "Workspace not found." };
  if (access.role !== "admin" && access.role !== "hr")
    return { ok: false, error: "Only Admin or HR can manage review cycles." };
  const { data: { user } } = await access.supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  return { ok: true, access, userId: user.id };
}

export async function createReviewCycle(
  input: unknown,
): Promise<CycleActionResult<{ id: string }>> {
  const parsed = createCycleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const auth = await ensureAdminOrHr();
  if (!auth.ok) return auth;
  const { access, userId } = auth;

  if (parsed.data.period_start > parsed.data.period_end) {
    return { ok: false, error: "Period end must be after period start." };
  }

  const { data: orgRow } = await access.supabase
    .from("organizations")
    .select("plan")
    .eq("id", access.orgId)
    .maybeSingle();
  const plan = normalizePlan(orgRow?.plan as string | null | undefined);
  const preset = parsed.data.review_template_preset as ReviewTemplatePresetId;
  if (!presetAvailableOnPlan(preset, plan)) {
    return {
      ok: false,
      error:
        "Specialised review questionnaires require Pro or Pro+. Choose General, or upgrade your plan.",
    };
  }

  let scoped_team_names_insert: string[] | null = null;
  if (!parsed.data.scope_entire_org && (parsed.data.scoped_team_names?.length ?? 0) > 0) {
    const uniq = new Set<string>();
    for (const raw of parsed.data.scoped_team_names ?? []) {
      const { data: matchedTeam, error: teamErr } = await access.supabase
        .from("teams")
        .select("name")
        .eq("org_id", access.orgId)
        .ilike("name", raw.trim())
        .maybeSingle();

      if (teamErr || !matchedTeam) {
        return {
          ok: false,
          error: `Team "${raw}" was not found. Create it under Organisation → Teams first.`,
        };
      }
      uniq.add((matchedTeam.name as string).trim());
    }
    scoped_team_names_insert = [...uniq];
  }

  let scoped_department_ids_insert: string[] | null = null;
  if (!parsed.data.scope_entire_org && (parsed.data.scoped_department_ids?.length ?? 0) > 0) {
    const uniqDept = new Set<string>();
    for (const deptId of parsed.data.scoped_department_ids ?? []) {
      const { data: deptRow } = await access.supabase
        .from("departments")
        .select("id")
        .eq("org_id", access.orgId)
        .eq("id", deptId)
        .maybeSingle();
      if (!deptRow?.id) {
        return {
          ok: false,
          error: "One of the selected departments was not found in this workspace.",
        };
      }
      uniqDept.add(deptRow.id as string);
    }
    scoped_department_ids_insert = [...uniqDept];
  }

  const { data, error } = await access.supabase
    .from("review_cycles")
    .insert({
      org_id: access.orgId,
      title: parsed.data.title,
      cadence: parsed.data.cadence as ReviewCadence,
      period_start: parsed.data.period_start,
      period_end: parsed.data.period_end,
      self_review_due: parsed.data.self_review_due ?? null,
      scoped_team_names: scoped_team_names_insert,
      scoped_department_ids: scoped_department_ids_insert,
      self_review_template_preset: preset,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateCycleSurfaces();
  return { ok: true, data: { id: data.id } };
}

/**
 * Opens a cycle: status becomes 'open' and upserts employee_self_reviews rows
 * for employees in scope (entire org or union of selected teams / directory departments).
 * Questionnaire copy comes from the cycle’s `self_review_template_preset` set at creation time.
 */
export async function openReviewCycle(
  input: unknown,
): Promise<CycleActionResult<{ invited: number }>> {
  const parsed = openCycleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cycle ID." };

  const auth = await ensureAdminOrHr();
  if (!auth.ok) return auth;
  const { access } = auth;

  const admin = createServiceRoleSupabase();

  // Verify cycle belongs to this org (RLS-aware user client keeps cross-tenant safe)
  const { data: cycle, error: cErr } = await access.supabase
    .from("review_cycles")
    .select(
      "id, status, org_id, scoped_team_names, scoped_department_ids, self_review_template_preset",
    )
    .eq("id", parsed.data.cycleId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (cErr || !cycle) return { ok: false, error: "Cycle not found." };
  if (cycle.status !== "draft")
    return { ok: false, error: "Only draft cycles can be opened." };

  const { data: orgRow, error: orgErr } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", access.orgId)
    .maybeSingle();

  if (orgErr) return { ok: false, error: orgErr.message };

  const { data: roster, error: empErr } = await admin
    .from("employees")
    .select("id, team_name, department")
    .eq("org_id", access.orgId)
    .eq("is_active", true);

  if (empErr) return { ok: false, error: empErr.message };

  const scopedTeams = cycle.scoped_team_names as string[] | null | undefined;
  const scopedDeptIds = cycle.scoped_department_ids as string[] | null | undefined;
  const hasTeams = Array.isArray(scopedTeams) && scopedTeams.length > 0;
  const hasDepts = Array.isArray(scopedDeptIds) && scopedDeptIds.length > 0;

  const teamKeySet = new Set<string>(
    hasTeams ? (scopedTeams ?? []).map((t) => normalizeDepartmentKey(String(t))) : [],
  );
  const deptNameKeySet = new Set<string>();

  if (hasDepts) {
    const { data: deptRows, error: dErr } = await admin
      .from("departments")
      .select("id, name")
      .eq("org_id", access.orgId)
      .in("id", scopedDeptIds ?? []);
    if (dErr) return { ok: false, error: dErr.message };
    for (const row of deptRows ?? []) {
      deptNameKeySet.add(normalizeDepartmentKey(row.name as string));
    }
  }

  const picked =
    roster?.filter((e) => {
      if (!hasTeams && !hasDepts) return true;
      const okTeam =
        !hasTeams || teamKeySet.has(normalizeDepartmentKey((e.team_name as string | null) ?? ""));
      const okDept =
        !hasDepts ||
        deptNameKeySet.has(normalizeDepartmentKey((e.department as string | null) ?? ""));
      return okTeam || okDept;
    }) ?? [];

  const rows = picked.map((emp) => ({
    review_cycle_id: parsed.data.cycleId,
    employee_id: emp.id as string,
    org_id: access.orgId,
    status: "pending" as const,
    template_id: null as string | null,
  }));

  if (rows.length === 0) {
    return {
      ok: false,
      error:
        "No active employees belong to this cycle's scope. Assign teams or directory departments that match your selection, or widen scope before opening.",
    };
  }

  const { error: insErr } = await admin
    .from("employee_self_reviews")
    .upsert(rows, { onConflict: "review_cycle_id,employee_id", ignoreDuplicates: true });
  if (insErr) return { ok: false, error: insErr.message };

  const { error: updErr } = await admin
    .from("review_cycles")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.cycleId)
    .eq("org_id", access.orgId);

  if (updErr) return { ok: false, error: updErr.message };

  revalidateCycleSurfaces(parsed.data.cycleId);
  return { ok: true, data: { invited: rows.length } };
}

export async function closeReviewCycle(
  input: unknown,
): Promise<CycleActionResult> {
  const parsed = closeCycleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cycle ID." };

  const auth = await ensureAdminOrHr();
  if (!auth.ok) return auth;
  const { access } = auth;

  const { error } = await access.supabase
    .from("review_cycles")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.cycleId)
    .eq("org_id", access.orgId);

  if (error) return { ok: false, error: error.message };
  revalidateCycleSurfaces(parsed.data.cycleId);
  return { ok: true };
}

export async function deleteReviewCycle(
  input: unknown,
): Promise<CycleActionResult> {
  const parsed = deleteCycleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cycle ID." };

  const auth = await ensureAdminOrHr();
  if (!auth.ok) return auth;
  const { access } = auth;

  const { data: cycle } = await access.supabase
    .from("review_cycles")
    .select("status")
    .eq("id", parsed.data.cycleId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!cycle) return { ok: false, error: "Cycle not found." };
  if (cycle.status === "closed")
    return { ok: false, error: "Closed cycles cannot be deleted." };

  const { error } = await access.supabase
    .from("review_cycles")
    .delete()
    .eq("id", parsed.data.cycleId)
    .eq("org_id", access.orgId);

  if (error) return { ok: false, error: error.message };
  revalidateCycleSurfaces();
  return { ok: true };
}

// ─── Self-review submission (public, uses service role) ────────────────────

const submitSelfReviewSchema = z.object({
  token: z.string().min(1),
  highlights: z.string().max(4000).default(""),
  challenges: z.string().max(4000).default(""),
  goals_next_period: z.string().max(4000).default(""),
  collaboration_note: z.string().max(4000).default(""),
  growth_areas: z.string().max(4000).default(""),
  support_needed: z.string().max(2000).default(""),
  self_rating: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.union([z.null(), z.number().int().min(1).max(5)]),
  ),
});

export async function submitSelfReview(
  input: unknown,
): Promise<CycleActionResult> {
  const parsed = submitSelfReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  // Use service role so unauthenticated employees can submit
  const admin = createServiceRoleSupabase();

  const { data: row, error: findErr } = await admin
    .from("employee_self_reviews")
    .select("id, status, org_id, review_cycles(self_review_template_preset)")
    .eq("form_token", parsed.data.token)
    .maybeSingle();

  if (findErr || !row) return { ok: false, error: "This review link is invalid or expired." };
  if (row.status === "submitted")
    return { ok: false, error: "You have already submitted this review." };

  const { data: orgRow } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", row.org_id as string)
    .maybeSingle();

  const cycleEmb = row as unknown as {
    review_cycles?: { self_review_template_preset?: string | null } | null;
  };
  const definition = definitionForCyclePresetAndPlan(
    cycleEmb.review_cycles?.self_review_template_preset,
    orgRow?.plan as string | null | undefined,
  );

  const validationError = validateSelfReviewPayloadAgainstDefinition({
    definition,
    highlights: parsed.data.highlights,
    challenges: parsed.data.challenges,
    goals_next_period: parsed.data.goals_next_period,
    collaboration_note: parsed.data.collaboration_note,
    growth_areas: parsed.data.growth_areas,
    support_needed: parsed.data.support_needed,
    self_rating: parsed.data.self_rating,
  });
  if (validationError) return { ok: false, error: validationError };

  const { error: updErr } = await admin
    .from("employee_self_reviews")
    .update({
      highlights: parsed.data.highlights,
      challenges: parsed.data.challenges,
      goals_next_period: parsed.data.goals_next_period,
      collaboration_note: parsed.data.collaboration_note,
      growth_areas: parsed.data.growth_areas,
      support_needed: parsed.data.support_needed,
      self_rating: parsed.data.self_rating,
      status: "submitted",
      workflow_status: "employee_submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

// ─── Manager remarks ─────────────────────────────────────────────────────────

const saveRemarksSchema = z.object({
  selfReviewId: z.uuid(),
  highlights_remark: z.string().max(4000).default(""),
  challenges_remark: z.string().max(4000).default(""),
  goals_remark: z.string().max(4000).default(""),
  growth_remark: z.string().max(4000).default(""),
  final_remark: z.string().max(8000).default(""),
  overall_rating: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.union([z.null(), z.number().int().min(1).max(5)]),
  ),
});

export async function saveManagerRemarks(
  input: unknown,
): Promise<CycleActionResult<{ id: string }>> {
  const parsed = saveRemarksSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const access = await getOrgAccess();
  if (!access) return { ok: false, error: "Workspace not found." };
  if (access.role === "admin" || access.role === "hr") {
    return {
      ok: false,
      error:
        "Only the employee’s manager or team lead can add manager remarks. HR and Admin can review after they submit to HR.",
    };
  }
  if (access.role !== "manager" && access.role !== "tl") {
    return { ok: false, error: "You don't have permission to add remarks." };
  }

  const { data: { user } } = await access.supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Load self-review to get IDs
  const { data: selfReview, error: srErr } = await access.supabase
    .from("employee_self_reviews")
    .select("id, employee_id, review_cycle_id, org_id, workflow_status")
    .eq("id", parsed.data.selfReviewId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (srErr || !selfReview) return { ok: false, error: "Self-review not found." };

  const workflow = ((selfReview as { workflow_status?: string }).workflow_status ??
    "draft") as string;
  if (workflow === "draft") {
    return {
      ok: false,
      error: "The employee must submit their self-review before you can add remarks.",
    };
  }
  if (workflow === "finalized") {
    return { ok: false, error: "This review is finalized and cannot be edited." };
  }
  if (workflow === "hr_review_pending") {
    return {
      ok: false,
      error:
        "This review is waiting for HR. You can edit again only if HR requests revisions.",
    };
  }

  const upsertPayload = {
    self_review_id: parsed.data.selfReviewId,
    employee_id: selfReview.employee_id,
    review_cycle_id: selfReview.review_cycle_id,
    org_id: access.orgId,
    manager_user_id: user.id,
    highlights_remark: parsed.data.highlights_remark,
    challenges_remark: parsed.data.challenges_remark,
    goals_remark: parsed.data.goals_remark,
    growth_remark: parsed.data.growth_remark,
    final_remark: parsed.data.final_remark,
    overall_rating: parsed.data.overall_rating,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await access.supabase
    .from("review_manager_remarks")
    .upsert(upsertPayload, { onConflict: "self_review_id,manager_user_id" })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/reviews/${selfReview.review_cycle_id}`);
  revalidatePath(`/reviews/${selfReview.review_cycle_id}/${selfReview.employee_id}`);
  return { ok: true, data: { id: data.id } };
}

const finalizeHrReviewSchema = z.object({
  selfReviewId: z.uuid(),
  remarksId: z.uuid(),
  hr_remarks: z.string().max(8000).default(""),
});

/**
 * HR / Admin — records HR remarks and finalizes the review (immutable afterward).
 */
export async function finalizeHrReview(
  input: unknown,
): Promise<CycleActionResult> {
  const parsed = finalizeHrReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const access = await getOrgAccess();
  if (!access) return { ok: false, error: "Workspace not found." };
  if (access.role !== "admin" && access.role !== "hr") {
    return { ok: false, error: "Only Admin or HR can finalize reviews." };
  }

  const { data: { user } } = await access.supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const now = new Date().toISOString();

  const { data: sr, error: srErr } = await access.supabase
    .from("employee_self_reviews")
    .select("id, review_cycle_id, employee_id, org_id, workflow_status")
    .eq("id", parsed.data.selfReviewId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (srErr || !sr) return { ok: false, error: "Self-review not found." };

  const srWorkflow = (sr as { workflow_status?: string }).workflow_status ?? "draft";
  if (srWorkflow !== "hr_review_pending") {
    return {
      ok: false,
      error: "Reviews can only be finalized when HR is reviewing them.",
    };
  }

  const { data: remark, error: rErr } = await access.supabase
    .from("review_manager_remarks")
    .select("id, self_review_id, status")
    .eq("id", parsed.data.remarksId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (rErr || !remark || remark.self_review_id !== sr.id) {
    return { ok: false, error: "Manager remarks not found for this review." };
  }

  const remarkStatus = (remark as { status?: string }).status;
  if (remarkStatus !== "submitted") {
    return {
      ok: false,
      error: "Finalize only applies after the manager submits remarks to HR.",
    };
  }

  const cycleId = sr.review_cycle_id as string;

  const { error: apErr } = await access.supabase
    .from("review_manager_remarks")
    .update({
      status: "approved",
      approved_at: now,
      approved_by: user.id,
      updated_at: now,
    })
    .eq("id", parsed.data.remarksId)
    .eq("org_id", access.orgId);

  if (apErr) return { ok: false, error: apErr.message };

  const { error: wfErr } = await access.supabase
    .from("employee_self_reviews")
    .update({
      workflow_status: "finalized",
      hr_remarks: parsed.data.hr_remarks,
      hr_rejection_reason: null,
      finalized_at: now,
      finalized_by: user.id,
      updated_at: now,
    })
    .eq("id", sr.id)
    .eq("org_id", access.orgId);

  if (wfErr) return { ok: false, error: wfErr.message };

  revalidatePath(`/reviews/${cycleId}`);
  revalidatePath(`/reviews/${cycleId}/${sr.employee_id}`);
  revalidatePath("/reviews");
  return { ok: true };
}

const rejectHrReviewSchema = z.object({
  selfReviewId: z.uuid(),
  remarksId: z.uuid(),
  /** Shown to the manager so they can revise and resubmit. */
  rejection_reason: z.string().trim().min(3, "Add a brief reason").max(2000),
});

export async function rejectHrReview(input: unknown): Promise<CycleActionResult> {
  const parsed = rejectHrReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const access = await getOrgAccess();
  if (!access) return { ok: false, error: "Workspace not found." };
  if (access.role !== "admin" && access.role !== "hr") {
    return { ok: false, error: "Only Admin or HR can request revisions." };
  }

  const now = new Date().toISOString();

  const { data: sr, error: srErr } = await access.supabase
    .from("employee_self_reviews")
    .select("id, review_cycle_id, employee_id, org_id, workflow_status")
    .eq("id", parsed.data.selfReviewId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (srErr || !sr) return { ok: false, error: "Self-review not found." };

  const srWorkflow = (sr as { workflow_status?: string }).workflow_status ?? "draft";
  if (srWorkflow !== "hr_review_pending") {
    return { ok: false, error: "Rejection is only available while HR is reviewing." };
  }

  const { data: remark } = await access.supabase
    .from("review_manager_remarks")
    .select("id, self_review_id")
    .eq("id", parsed.data.remarksId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!remark || remark.self_review_id !== sr.id) {
    return { ok: false, error: "Manager remarks not found for this review." };
  }

  const cycleId = sr.review_cycle_id as string;

  const { error: wfErr } = await access.supabase
    .from("employee_self_reviews")
    .update({
      workflow_status: "revision_requested",
      hr_rejection_reason: parsed.data.rejection_reason,
      hr_remarks: "",
      finalized_at: null,
      finalized_by: null,
      updated_at: now,
    })
    .eq("id", sr.id)
    .eq("org_id", access.orgId);

  if (wfErr) return { ok: false, error: wfErr.message };

  const { error: rmkErr } = await access.supabase
    .from("review_manager_remarks")
    .update({
      status: "draft",
      submitted_at: null,
      updated_at: now,
    })
    .eq("id", parsed.data.remarksId)
    .eq("org_id", access.orgId);

  if (rmkErr) return { ok: false, error: rmkErr.message };

  revalidatePath(`/reviews/${cycleId}`);
  revalidatePath(`/reviews/${cycleId}/${sr.employee_id}`);
  revalidatePath("/reviews");
  return { ok: true };
}

const submitToHrSchema = saveRemarksSchema.extend({});

/** Manager line — locks manager remarks & sends the packet to HR for approval. */
export async function submitManagerReviewToHr(
  input: unknown,
): Promise<CycleActionResult<{ id: string }>> {
  const parsed = submitToHrSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const access = await getOrgAccess();
  if (!access) return { ok: false, error: "Workspace not found." };
  if (access.role === "admin" || access.role === "hr") {
    return {
      ok: false,
      error:
        "Only the employee’s manager or team lead can submit remarks to HR. Admins and HR approve or reject after that step.",
    };
  }
  if (access.role !== "manager" && access.role !== "tl") {
    return { ok: false, error: "You don't have permission to submit manager remarks." };
  }

  const { data: { user } } = await access.supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: selfReview, error: srErr } = await access.supabase
    .from("employee_self_reviews")
    .select("id, employee_id, review_cycle_id, org_id, workflow_status, status")
    .eq("id", parsed.data.selfReviewId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (srErr || !selfReview) return { ok: false, error: "Self-review not found." };

  const selfStatus = (selfReview as { status?: string }).status;
  if (selfStatus !== "submitted" && selfStatus !== "late") {
    return {
      ok: false,
      error: "The employee must submit their self-review before you send to HR.",
    };
  }

  const wf =
    ((selfReview as { workflow_status?: string }).workflow_status ?? "draft");
  if (!(wf === "employee_submitted" || wf === "revision_requested")) {
    if (wf === "finalized") {
      return { ok: false, error: "This review is already finalized." };
    }
    return {
      ok: false,
      error: "Cannot send to HR in the current workflow state.",
    };
  }

  const now = new Date().toISOString();

  const upsertPayload = {
    self_review_id: parsed.data.selfReviewId,
    employee_id: selfReview.employee_id,
    review_cycle_id: selfReview.review_cycle_id,
    org_id: access.orgId,
    manager_user_id: user.id,
    highlights_remark: parsed.data.highlights_remark,
    challenges_remark: parsed.data.challenges_remark,
    goals_remark: parsed.data.goals_remark,
    growth_remark: parsed.data.growth_remark,
    final_remark: parsed.data.final_remark,
    overall_rating: parsed.data.overall_rating,
    status: "submitted" as const,
    submitted_at: now,
    updated_at: now,
  };

  const { data, error } = await access.supabase
    .from("review_manager_remarks")
    .upsert(upsertPayload, { onConflict: "self_review_id,manager_user_id" })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const { error: wfErr } = await access.supabase
    .from("employee_self_reviews")
    .update({
      workflow_status: "hr_review_pending",
      hr_rejection_reason: null,
      hr_remarks: "",
      finalized_at: null,
      finalized_by: null,
      updated_at: now,
    })
    .eq("id", selfReview.id)
    .eq("org_id", access.orgId);

  if (wfErr) return { ok: false, error: wfErr.message };

  revalidatePath(`/reviews/${selfReview.review_cycle_id}`);
  revalidatePath(`/reviews/${selfReview.review_cycle_id}/${selfReview.employee_id}`);
  return { ok: true, data: { id: data.id } };
}
