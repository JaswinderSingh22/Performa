"use server";

import { getOrgAccess } from "@/lib/org-context";
import {
  assertAiAssistAllowedForEmployee,
  recordAiAssistUsage,
} from "@/lib/billing/ai-limits";import {
  achievementInPeriod,
  noteInPeriod,
} from "@/lib/employee-period-evidence";
import { encompassingRange } from "@/lib/period-range";
import { runReviewAssistPrompt } from "@/lib/review-ai/complete";
import { assistReviewPeriodSchema } from "@/validators/review-period";

export type AssistReviewActionResult =
  | {
      ok: true;
      data: {
        dimensions: { label: string; analysis: string; rating: number }[];
        ai_draft: string;
        final_review: string;
        overall_rating: number;
      };
    }
  | { ok: false; error: string };

function formatAchievementLines(
  rows: { title: string; category: string; achievement_date: string | null }[],
): string {
  const lines = rows.map((row) => {
    const date = row.achievement_date
      ? ` (${row.achievement_date})`
      : "";
    return `- ${row.title} [${row.category}]${date}`;
  });
  return lines.length > 0 ? lines.join("\n") : "- (none recorded)";
}

function formatNoteBodies(bodies: string[]): string {
  const trimmed = bodies.map((t) => t.trim()).filter((t) => t.length > 0);
  if (trimmed.length === 0) return "- (none recorded)";
  return trimmed.map((t, i) => `${i + 1}. ${t}`).join("\n\n");
}

function narrativeForStitch(row: {
  final_review: string | null;
  ai_draft: string | null;
}): string | null {
  const f = row.final_review?.trim() ?? "";
  if (f.length >= 15) return f;
  const a = row.ai_draft?.trim() ?? "";
  if (a.length >= 40) return a;
  return null;
}

export async function assistReviewFromPeriod(
  input: unknown,
): Promise<AssistReviewActionResult> {
  const parsed = assistReviewPeriodSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Unable to validate the request.";
    return { ok: false, error: msg };
  }

  const access = await getOrgAccess();
  if (!access) {
    return { ok: false, error: "We could not load your workspace." };
  }

  const { data: employee } = await access.supabase
    .from("employees")
    .select(
      "id, name, email, role, department, team_name, join_date, created_at",
    )
    .eq("id", parsed.data.employeeId)
    .eq("org_id", access.orgId)
    .maybeSingle();

  if (!employee) {
    return { ok: false, error: "Employee not found in your workspace." };
  }

  const employeeBlock = [
    `Employee: ${employee.name} <${employee.email}>`,
    `Role: ${employee.role || "—"} | Dept: ${employee.department || "—"} | Team: ${(employee.team_name ?? "").trim() || "—"}`,
    `Join date: ${employee.join_date ?? "—"}`,
    `Evidence window (inclusive calendar dates): ${parsed.data.dateFrom} through ${parsed.data.dateTo}`,
  ].join("\n");

  const aiFocus: string[] = [];

  let contextBlock = "";

  if (parsed.data.strategy === "raw_period") {
    const { data: achievements } = await access.supabase
      .from("achievements")
      .select("title, category, achievement_date, created_at")
      .eq("employee_id", parsed.data.employeeId)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false })
      .limit(160);

    const { data: notes } = await access.supabase
      .from("employee_notes")
      .select("body, created_at")
      .eq("employee_id", parsed.data.employeeId)
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false })
      .limit(160);

    const achFiltered = (achievements ?? []).filter((a) =>
      achievementInPeriod(a, parsed.data.dateFrom, parsed.data.dateTo),
    );
    const notesFiltered = (notes ?? []).filter((n) =>
      noteInPeriod(n, parsed.data.dateFrom, parsed.data.dateTo),
    );

    if (achFiltered.length === 0 && notesFiltered.length === 0) {
      aiFocus.push(
        "No achievements or notes fall in this calendar range—explicitly keep claims conservative and note limited evidence.",
      );
    }

    contextBlock = [
      employeeBlock,
      "",
      `## Planned review title\n${parsed.data.title?.trim() || "Performance roll-up summary"}`,
      "",
      "### Input mode\nRaw manager notes & achievements scoped to the window above.",
      "",
      "## Achievements in window",
      formatAchievementLines(
        achFiltered.map((a) => ({
          title: a.title,
          category: a.category,
          achievement_date: a.achievement_date,
        })),
      ),
      "",
      "## Manager notes captured in window",
      formatNoteBodies(notesFiltered.map((n) => n.body)),
    ].join("\n");
  } else {
    const { data: sourceRows } = await access.supabase
      .from("reviews")
      .select(
        "id, title, period_start, period_end, final_review, ai_draft, source_review_ids",
      )
      .eq("org_id", access.orgId)
      .eq("employee_id", parsed.data.employeeId)
      .in("id", parsed.data.sourceReviewIds);

    if (!sourceRows || sourceRows.length !== parsed.data.sourceReviewIds.length) {
      return {
        ok: false,
        error:
          "One or more selected reviews could not be loaded. Refresh and pick quarter reviews again.",
      };
    }

    for (const r of sourceRows) {
      if (!r.period_start || !r.period_end) {
        return {
          ok: false,
          error:
            "Each stitched review needs a recorded period boundary (create quarter roll-ups with date ranges first).",
        };
      }

      const nested = r.source_review_ids as unknown;
      const nestedArr = Array.isArray(nested)
        ? (nested as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      if (nestedArr.length > 0) {
        return {
          ok: false,
          error:
            "Pick only primary quarter summaries for stitching—not reviews that already merged other sources.",
        };
      }

      if (!narrativeForStitch(r)) {
        return {
          ok: false,
          error:
            "Each quarterly pick needs either a saved summary (15+ characters) or a substantive draft (40+ characters).",
        };
      }
    }

    const sorted = [...sourceRows].sort((a, b) =>
      String(a.period_start).localeCompare(String(b.period_start)),
    );

    const env = encompassingRange(
      sorted.map((r) => ({
        from: r.period_start as string,
        to: r.period_end as string,
      })),
    );
    if (!env) {
      return { ok: false, error: "Unable to derive a stitched period envelope." };
    }

    if (
      parsed.data.dateFrom !== env.from ||
      parsed.data.dateTo !== env.to
    ) {
      return {
        ok: false,
        error: `This selection spans ${env.from} through ${env.to}. Use exactly that range (required for stitching).`,
      };
    }

    const sections = sorted
      .map((r, i) => {
        const body = narrativeForStitch(r) ?? "";
        const label = r.title?.trim() || `Review ${i + 1}`;
        return `### Quarter block ${i + 1}: ${label} (${r.period_start} – ${r.period_end})\n${body}`;
      })
      .join("\n\n");

    contextBlock = [
      employeeBlock,
      "",
      `## Planned review title\n${parsed.data.title?.trim() || "Multi-quarter roll-up"}`,
      "",
      "### Input mode\nToken-efficient merge of existing quarter narratives only.",
      "",
      "## Prior quarter narratives (authoritative)",
      sections,
    ].join("\n");

    aiFocus.push(
      "Synthesize continuity across blocks without contradicting prior narratives or inventing new incidents.",
    );
  }

  const quota = await assertAiAssistAllowedForEmployee(
    access,
    parsed.data.employeeId,
  );
  if (!quota.ok) {
    return { ok: false, error: quota.reason };
  }

  try {
    const result = await runReviewAssistPrompt({
      mode: "generate",
      userBlock: contextBlock,
      focusNote: aiFocus.length > 0 ? aiFocus.join("\n") : undefined,
    });
    await recordAiAssistUsage(access, parsed.data.employeeId);
    return {
      ok: true,
      data: {
        dimensions: result.dimensions.map((d) => ({
          label: d.label.trim(),
          analysis: d.analysis.trim(),
          rating: d.rating,
        })),
        ai_draft: result.ai_draft.trim(),
        final_review: result.final_review.trim(),
        overall_rating: result.overall_rating,
      },
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Something went wrong with the AI step.";
    return { ok: false, error: message };
  }
}
