"use server";

import { revalidatePath } from "next/cache";

import type { OrgAccess } from "@/lib/org-context";
import { getOrgAccess } from "@/lib/org-context";
import {
  reviewCreateSchema,
  reviewDeleteSchema,
  reviewPublishSchema,
  reviewUpdateSchema,
} from "@/validators/review";
import {
  normalizeChecklistForStorage,
  ratingFromChecklist,
} from "@/lib/review-checklist";

export type ReviewActionResult = { ok: true } | { ok: false; error: string };

function revalidateReviewSurfaces(employeeId: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath(`/employees/${employeeId}/generate-review`);
  revalidatePath(`/employees/${employeeId}/insights`);
  revalidatePath(`/employees/${employeeId}/performance`);
  revalidatePath("/reviews");
  revalidatePath("/achievements");
  revalidatePath("/notes");
}

function toNullableText(raw: string): string | null {
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

function overallRatingFromDimensions(
  dimensions: { rating: number }[],
  manualRating: number | null,
): number | null {
  if (dimensions.length > 0) {
    const avg =
      dimensions.reduce((acc, row) => acc + row.rating, 0) /
      dimensions.length;
    return Math.min(5, Math.max(1, Math.round(avg)));
  }
  return manualRating;
}

function resolveStoredReviewRating(
  checklist: Record<string, boolean | undefined> | undefined,
  dimensions: { rating: number }[],
  manualRating: number | null,
): number | null {
  const norm = normalizeChecklistForStorage(checklist ?? {});
  const checklistRating = ratingFromChecklist(norm);
  if (checklistRating !== null) return checklistRating;
  return overallRatingFromDimensions(dimensions, manualRating);
}

async function syncReviewDimensions(
  access: OrgAccess,
  reviewId: string,
  dimensions: { label: string; analysis: string; rating: number }[],
): Promise<ReviewActionResult> {
  const { error: delErr } = await access.supabase
    .from("review_dimensions")
    .delete()
    .eq("review_id", reviewId)
    .eq("org_id", access.orgId);
  if (delErr) {
    return { ok: false as const, error: delErr.message };
  }

  if (dimensions.length === 0) {
    return { ok: true as const };
  }

  const { error: insErr } = await access.supabase.from("review_dimensions").insert(
    dimensions.map((d, i) => ({
      review_id: reviewId,
      org_id: access.orgId,
      label: d.label.trim(),
      analysis: d.analysis.trim(),
      rating: d.rating,
      sort_order: i,
    })),
  );
  if (insErr) {
    return { ok: false as const, error: insErr.message };
  }
  return { ok: true as const };
}

export async function createReview(
  input: unknown,
): Promise<ReviewActionResult> {
  const parsed = reviewCreateSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { data: employeeRow } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!employeeRow) {
    return {
      ok: false,
      error: "Employee not found in your organization.",
    };
  }

  const ratingStored = resolveStoredReviewRating(
    parsed.data.checklist,
    parsed.data.dimensions,
    parsed.data.rating,
  );

  const checklistStored = normalizeChecklistForStorage(parsed.data.checklist ?? {});

  const { data: inserted, error } = await access.supabase
    .from("reviews")
    .insert({
      employee_id: parsed.data.employeeId,
      org_id: access.orgId,
      title: parsed.data.title.trim(),
      status: parsed.data.status,
      rating: ratingStored,
      checklist: checklistStored,
      ai_draft: toNullableText(parsed.data.ai_draft),
      final_review: toNullableText(parsed.data.final_review),
      period_start: parsed.data.periodStart ?? null,
      period_end: parsed.data.periodEnd ?? null,
      source_review_ids:
        parsed.data.sourceReviewIds &&
        parsed.data.sourceReviewIds.length > 0
          ? parsed.data.sourceReviewIds
          : null,
      generation_strategy: parsed.data.generationStrategy ?? null,
      review_cadence: parsed.data.reviewCadence ?? null,
      period_key: parsed.data.periodKey?.trim()
        ? parsed.data.periodKey.trim()
        : null,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const dimSync = await syncReviewDimensions(
    access,
    inserted.id,
    parsed.data.dimensions,
  );

  if (!dimSync.ok) {
    await access.supabase
      .from("reviews")
      .delete()
      .eq("id", inserted.id)
      .eq("org_id", access.orgId);
    return dimSync;
  }

  revalidateReviewSurfaces(parsed.data.employeeId);
  return { ok: true };
}

export async function updateReview(
  input: unknown,
): Promise<ReviewActionResult> {
  const parsed = reviewUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Unable to validate review update.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { data: reviewRow } = await access.supabase
    .from("reviews")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("employee_id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!reviewRow) {
    return {
      ok: false,
      error: "Review not found or unavailable.",
    };
  }

  const ratingStored = resolveStoredReviewRating(
    parsed.data.checklist,
    parsed.data.dimensions,
    parsed.data.rating,
  );

  const checklistStored = normalizeChecklistForStorage(parsed.data.checklist ?? {});

  const { error } = await access.supabase
    .from("reviews")
    .update({
      title: parsed.data.title.trim(),
      status: parsed.data.status,
      rating: ratingStored,
      checklist: checklistStored,
      ai_draft: toNullableText(parsed.data.ai_draft),
      final_review: toNullableText(parsed.data.final_review),
    })
    .eq("id", parsed.data.id)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const dimSync = await syncReviewDimensions(
    access,
    parsed.data.id,
    parsed.data.dimensions,
  );

  if (!dimSync.ok) {
    return dimSync;
  }

  revalidateReviewSurfaces(parsed.data.employeeId);
  return { ok: true };
}

export async function deleteReview(
  input: unknown,
): Promise<ReviewActionResult> {
  const parsed = reviewDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid delete request." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { error } = await access.supabase
    .from("reviews")
    .delete()
    .eq("id", parsed.data.id)
    .eq("employee_id", parsed.data.employeeId)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateReviewSurfaces(parsed.data.employeeId);
  return { ok: true };
}

export async function publishReview(
  input: unknown,
): Promise<ReviewActionResult> {
  const parsed = reviewPublishSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid publish request." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { data: row } = await access.supabase
    .from("reviews")
    .select("id, status, final_review")
    .eq("id", parsed.data.id)
    .eq("employee_id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Review not found or unavailable." };
  }

  if (row.status !== "draft") {
    return {
      ok: false,
      error:
        "This review is already published or archived. Use edit to adjust status.",
    };
  }

  const summary = row.final_review?.trim() ?? "";
  if (summary.length < 15) {
    return {
      ok: false,
      error:
        "Add at least 15 characters to the final summary before publishing.",
    };
  }

  const { error } = await access.supabase
    .from("reviews")
    .update({ status: "published" })
    .eq("id", parsed.data.id)
    .eq("employee_id", parsed.data.employeeId)
    .eq("org_id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateReviewSurfaces(parsed.data.employeeId);
  return { ok: true };
}
