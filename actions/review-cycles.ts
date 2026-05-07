"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
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

const createCycleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  cadence: z.enum(["monthly", "quarterly", "mid_year", "yearly"]),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  self_review_due: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
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

  const { data, error } = await access.supabase
    .from("review_cycles")
    .insert({
      org_id: access.orgId,
      title: parsed.data.title,
      cadence: parsed.data.cadence as ReviewCadence,
      period_start: parsed.data.period_start,
      period_end: parsed.data.period_end,
      self_review_due: parsed.data.self_review_due ?? null,
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
 * Opens a cycle: status becomes 'open' and creates employee_self_reviews rows
 * for all active employees in the org (or scoped team for tl/manager).
 */
export async function openReviewCycle(
  input: unknown,
): Promise<CycleActionResult<{ invited: number }>> {
  const parsed = openCycleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cycle ID." };

  const auth = await ensureAdminOrHr();
  if (!auth.ok) return auth;
  const { access } = auth;

  // Verify cycle belongs to this org
  const { data: cycle, error: cErr } = await access.supabase
    .from("review_cycles")
    .select("id, status, org_id")
    .eq("id", parsed.data.cycleId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (cErr || !cycle) return { ok: false, error: "Cycle not found." };
  if (cycle.status !== "draft")
    return { ok: false, error: "Only draft cycles can be opened." };

  // Fetch all active employees
  const { data: employees, error: empErr } = await access.supabase
    .from("employees")
    .select("id")
    .eq("org_id", access.orgId)
    .eq("is_active", true);

  if (empErr) return { ok: false, error: empErr.message };

  const rows = (employees ?? []).map((e) => ({
    review_cycle_id: parsed.data.cycleId,
    employee_id: e.id,
    org_id: access.orgId,
    status: "pending" as const,
  }));

  if (rows.length > 0) {
    const { error: insErr } = await access.supabase
      .from("employee_self_reviews")
      .upsert(rows, { onConflict: "review_cycle_id,employee_id", ignoreDuplicates: true });
    if (insErr) return { ok: false, error: insErr.message };
  }

  const { error: updErr } = await access.supabase
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
    .select("id, status")
    .eq("form_token", parsed.data.token)
    .maybeSingle();

  if (findErr || !row) return { ok: false, error: "This review link is invalid or expired." };
  if (row.status === "submitted")
    return { ok: false, error: "You have already submitted this review." };

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
  if (!["admin", "hr", "manager", "tl"].includes(access.role ?? ""))
    return { ok: false, error: "You don't have permission to add remarks." };

  const { data: { user } } = await access.supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Load self-review to get IDs
  const { data: selfReview, error: srErr } = await access.supabase
    .from("employee_self_reviews")
    .select("id, employee_id, review_cycle_id, org_id")
    .eq("id", parsed.data.selfReviewId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (srErr || !selfReview) return { ok: false, error: "Self-review not found." };

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

const approveRemarksSchema = z.object({ remarksId: z.uuid() });

export async function approveManagerRemarks(
  input: unknown,
): Promise<CycleActionResult> {
  const parsed = approveRemarksSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid remarks ID." };

  const access = await getOrgAccess();
  if (!access) return { ok: false, error: "Workspace not found." };
  if (access.role !== "admin" && access.role !== "hr")
    return { ok: false, error: "Only Admin or HR can approve reviews." };

  const { data: { user } } = await access.supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await access.supabase
    .from("review_manager_remarks")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.remarksId)
    .eq("org_id", access.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/reviews");
  return { ok: true };
}
