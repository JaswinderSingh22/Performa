"use server";

import { getOrgAccess } from "@/lib/org-context";
import {
  achievementInPeriod,
  noteInPeriod,
} from "@/lib/employee-period-evidence";
import { employeeEvidencePreviewSchema } from "@/validators/employee-evidence-preview";

export type PeriodEvidenceAchievement = {
  id: string;
  title: string;
  category: string;
  achievement_date: string | null;
  created_at: string;
};

export type PeriodEvidenceNote = {
  id: string;
  body: string;
  created_at: string;
};

export type EmployeeEvidencePreviewResult =
  | {
      ok: true;
      data: {
        achievements: PeriodEvidenceAchievement[];
        notes: PeriodEvidenceNote[];
      };
    }
  | { ok: false; error: string };

export async function previewEmployeePeriodEvidence(
  input: unknown,
): Promise<EmployeeEvidencePreviewResult> {
  const parsed = employeeEvidencePreviewSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ??
      "Unable to validate the preview request.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { employeeId, dateFrom, dateTo } = parsed.data;

  const { data: row } = await access.supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Employee not found." };
  }

  const [{ data: achievementsRaw }, { data: notesRaw }] = await Promise.all([
    access.supabase
      .from("achievements")
      .select("id, title, category, achievement_date, created_at")
      .eq("employee_id", employeeId)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false })
      .limit(200),
    access.supabase
      .from("employee_notes")
      .select("id, body, created_at")
      .eq("employee_id", employeeId)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const achievements = (achievementsRaw ?? []).filter((a) =>
    achievementInPeriod(a, dateFrom, dateTo),
  ) as PeriodEvidenceAchievement[];

  const notes = (notesRaw ?? []).filter((n) =>
    noteInPeriod(n, dateFrom, dateTo),
  ) as PeriodEvidenceNote[];

  return {
    ok: true,
    data: { achievements, notes },
  };
}
