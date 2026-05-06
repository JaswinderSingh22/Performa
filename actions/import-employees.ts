"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrgAccess } from "@/lib/org-context";
import {
  getMaxEmployees,
  isUnlimitedLimit,
  normalizePlan,
  planLabel,
} from "@/lib/plans";
import { getEffectivePlanFromOrg } from "@/lib/billing/getBillingState";
import { isUniqueViolation } from "@/types/database";

const importEmployeeRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  employee_code: z.string().trim().min(1),
  is_active: z.string().trim().optional().default(""),
  role: z.string().trim().optional().default(""),
  department: z.string().trim().optional().default(""),
  team_name: z.string().trim().optional().default(""),
  join_date: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  reporting_to_employee_code: z.string().trim().optional().default(""),
});

const importEmployeesSchema = z.object({
  rows: z.array(importEmployeeRowSchema).max(2500),
});

export type ImportEmployeesResult =
  | {
      ok: true;
      created: number;
      skippedDuplicates: number;
      skipped: { rowNumber: number; email: string; reason: string }[];
      errors: { rowNumber: number; email?: string; error: string }[];
    }
  | { ok: false; error: string };

function revalidateEmployeeSurfaces(): void {
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath("/reviews");
  revalidatePath("/achievements");
  revalidatePath("/notes");
}

export async function importEmployeesFromCsv(
  input: unknown,
): Promise<ImportEmployeesResult> {
  const parsed = importEmployeesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid import payload." };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { data: orgRow } = await access.supabase
    .from("organizations")
    .select("id, plan, subscription_status, subscription_current_end, razorpay_subscription_id")
    .eq("id", access.orgId)
    .maybeSingle();

  const plan = normalizePlan(orgRow ? getEffectivePlanFromOrg(orgRow) : undefined);
  if (plan === "free") {
    return {
      ok: false,
      error:
        "CSV import is available on Pro and Pro+ plans. Upgrade your workspace to import employees in bulk.",
    };
  }
  const seatCap = getMaxEmployees(plan);

  const [{ count: existingCount, error: cntErr }, { data: existingEmployees }] =
    await Promise.all([
      access.supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("org_id", access.orgId),
      access.supabase
        .from("employees")
        .select("id, email, employee_code")
        .eq("org_id", access.orgId)
        .limit(20000),
    ]);

  if (cntErr) return { ok: false, error: cntErr.message };

  const existingEmailToId = new Map<string, string>();
  const existingCodeToId = new Map<string, string>();
  for (const r of existingEmployees ?? []) {
    const email =
      typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
    if (!email) continue;
    if (typeof (r as { id?: unknown }).id === "string") {
      existingEmailToId.set(email, (r as { id: string }).id);
    }

    const code =
      typeof (r as { employee_code?: unknown }).employee_code === "string"
        ? ((r as { employee_code: string }).employee_code ?? "").trim()
        : "";
    if (code && typeof (r as { id?: unknown }).id === "string") {
      existingCodeToId.set(code, (r as { id: string }).id);
    }
  }

  const emailSet = new Set(existingEmailToId.keys());
  const codeSet = new Set(existingCodeToId.keys());

  let created = 0;
  let skippedDuplicates = 0;
  const skipped: { rowNumber: number; email: string; reason: string }[] = [];
  const errors: { rowNumber: number; email?: string; error: string }[] = [];

  let remainingSeats = isUnlimitedLimit(seatCap)
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (seatCap as number) - (existingCount ?? 0));

  if (!isUnlimitedLimit(seatCap) && remainingSeats <= 0) {
    return {
      ok: true,
      created: 0,
      skippedDuplicates: 0,
      skipped: [],
      errors: [
        {
          rowNumber: 0,
          error: `Your ${planLabel(plan)} workspace can include up to ${seatCap} people. Upgrade to add more.`,
        },
      ],
    };
  }

  for (const row of parsed.data.rows) {
    const email = row.email.trim().toLowerCase();
    if (emailSet.has(email)) {
      skippedDuplicates += 1;
      skipped.push({
        rowNumber: row.rowNumber,
        email,
        reason: "Already exists in this workspace.",
      });
      continue;
    }

    const employeeCode = row.employee_code?.trim() ?? "";
    if (employeeCode && codeSet.has(employeeCode)) {
      skippedDuplicates += 1;
      skipped.push({
        rowNumber: row.rowNumber,
        email,
        reason: `Employee ID ${employeeCode} already exists in this workspace.`,
      });
      continue;
    }
    if (!isUnlimitedLimit(seatCap) && remainingSeats <= 0) {
      errors.push({
        rowNumber: row.rowNumber,
        email,
        error: `Seat limit reached (${seatCap}). Upgrade to import more employees.`,
      });
      continue;
    }
    if (row.join_date) {
      const t = Date.parse(row.join_date);
      if (Number.isNaN(t)) {
        errors.push({
          rowNumber: row.rowNumber,
          email,
          error: "Join date is not a valid calendar date (expected YYYY-MM-DD).",
        });
        continue;
      }
    }

    const isActiveRaw = row.is_active?.trim().toLowerCase() ?? "";
    const isActive =
      isActiveRaw === ""
        ? true
        : !(
            isActiveRaw === "false" ||
            isActiveRaw === "0" ||
            isActiveRaw === "inactive" ||
            isActiveRaw === "resigned"
          );

    const reportingEmployeeCode =
      row.reporting_to_employee_code?.trim() ?? "";
    const reportingToEmployeeId = reportingEmployeeCode
      ? (existingCodeToId.get(reportingEmployeeCode) ?? null)
      : null;
    if (reportingEmployeeCode && !reportingToEmployeeId) {
      errors.push({
        rowNumber: row.rowNumber,
        email,
        error: `Reporting manager (Employee ID ${reportingEmployeeCode}) is not in this workspace yet.`,
      });
      continue;
    }

    const { data: inserted, error: insErr } = await access.supabase
      .from("employees")
      .insert({
        org_id: access.orgId,
        name: row.name.trim(),
        email,
        employee_code: row.employee_code.trim(),
        is_active: isActive,
        role: row.role?.trim() ?? "",
        department: row.department?.trim() ?? "",
        team_name: row.team_name?.trim() ?? "",
        join_date: row.join_date ?? null,
        reporting_to_employee_id: reportingToEmployeeId,
      })
      .select("id, email, employee_code")
      .single();

    if (insErr) {
      if (isUniqueViolation(insErr)) {
        skippedDuplicates += 1;
        skipped.push({
          rowNumber: row.rowNumber,
          email,
          reason: "Duplicate email or Employee ID (already exists).",
        });
        emailSet.add(email);
        if (employeeCode) codeSet.add(employeeCode);
        continue;
      }
      errors.push({ rowNumber: row.rowNumber, email, error: insErr.message });
      continue;
    }

    created += 1;
    emailSet.add(email);
    if (inserted?.id && inserted?.email) {
      existingEmailToId.set(inserted.email.trim().toLowerCase(), inserted.id);
    }
    if (inserted?.id && inserted?.employee_code?.trim()) {
      const code = inserted.employee_code.trim();
      existingCodeToId.set(code, inserted.id);
      codeSet.add(code);
    } else if (employeeCode) {
      codeSet.add(employeeCode);
    }
    if (!isUnlimitedLimit(seatCap)) remainingSeats -= 1;
  }

  revalidateEmployeeSurfaces();
  return { ok: true, created, skippedDuplicates, skipped, errors };
}

