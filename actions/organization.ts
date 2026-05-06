"use server";

import { revalidatePath } from "next/cache";

import { getOrgAccess } from "@/lib/org-context";
import {
  organizationRenameSchema,
  organizationReviewCycleSchema,
} from "@/validators/organization-settings";

export type OrganizationActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function renameOrganization(
  input: unknown,
): Promise<OrganizationActionResult> {
  const parsed = organizationRenameSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Check the workspace name and try again.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const {
    data: { user },
  } = await access.supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to rename the workspace." };
  }

  const { data: profile } = await access.supabase
    .from("workspace_members")
    .select("role")
    .eq("org_id", access.orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "hr") {
    return {
      ok: false,
      error: "Only workspace admins can change the organization name.",
    };
  }

  const { error } = await access.supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateOrganizationReviewCycle(
  input: unknown,
): Promise<OrganizationActionResult> {
  const parsed = organizationReviewCycleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid review cycle settings.",
    };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const {
    data: { user },
  } = await access.supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to change review cycle." };
  }

  const { data: profile } = await access.supabase
    .from("workspace_members")
    .select("role")
    .eq("org_id", access.orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "hr") {
    return {
      ok: false,
      error: "Only workspace admins can change review cycle settings.",
    };
  }

  const { error } = await access.supabase
    .from("organizations")
    .update({
      review_cadence: parsed.data.reviewCadence,
      quarter_start_month: parsed.data.quarterStartMonth,
    })
    .eq("id", access.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/teams");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return { ok: true };
}
