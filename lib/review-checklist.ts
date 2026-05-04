export const PERFORMANCE_CHECKLIST = [
  {
    slug: "outcomes_delivery",
    label: "Meets commitments and delivery expectations",
    weight: 2,
  },
  {
    slug: "values_collaboration",
    label: "Collaborates well and communicates respectfully",
    weight: 2,
  },
  {
    slug: "quality_craft",
    label: "Delivers appropriate quality / craft for the role",
    weight: 1,
  },
  {
    slug: "initiative_owner",
    label: "Takes accountability and shows constructive initiative",
    weight: 1,
  },
  {
    slug: "growth_feedback",
    label: "Responds well to feedback and invests in growth",
    weight: 1,
  },
] as const;

export type ChecklistSlug = (typeof PERFORMANCE_CHECKLIST)[number]["slug"];

export type ChecklistState = Partial<Record<ChecklistSlug, boolean>>;

export const CHECKLIST_TOTAL_WEIGHT = PERFORMANCE_CHECKLIST.reduce(
  (sum, row) => sum + row.weight,
  0,
);

export function emptyChecklistState(): Record<ChecklistSlug, boolean> {
  return Object.fromEntries(PERFORMANCE_CHECKLIST.map((r) => [r.slug, false])) as Record<
    ChecklistSlug,
    boolean
  >;
}

export function normalizeChecklistFromUnknown(raw: unknown): Record<ChecklistSlug, boolean> {
  const base = emptyChecklistState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }
  const o = raw as Record<string, unknown>;
  for (const slug of Object.keys(base) as ChecklistSlug[]) {
    base[slug] = Boolean(o[slug]);
  }
  return base;
}

export function normalizeChecklistForStorage(
  state: ChecklistState,
): Record<ChecklistSlug, boolean> {
  const base = emptyChecklistState();
  for (const slug of Object.keys(base) as ChecklistSlug[]) {
    if (state[slug] === true) {
      base[slug] = true;
    }
  }
  return base;
}

/** Any criterion marked met earns partial credit toward 1–5. Null if none met (fall back elsewhere). */
export function ratingFromChecklist(state: ChecklistState): number | null {
  let earned = 0;
  let anyMet = false;
  for (const row of PERFORMANCE_CHECKLIST) {
    if (state[row.slug]) {
      earned += row.weight;
      anyMet = true;
    }
  }
  if (!anyMet) return null;
  const pct = earned / CHECKLIST_TOTAL_WEIGHT;
  return Math.min(5, Math.max(1, Math.round(1 + 4 * pct)));
}

export function checklistProgress(state: ChecklistState): {
  earned: number;
  max: number;
  pct: number;
  anyMet: boolean;
} {
  let earned = 0;
  let anyMet = false;
  for (const row of PERFORMANCE_CHECKLIST) {
    if (state[row.slug]) {
      earned += row.weight;
      anyMet = true;
    }
  }
  return {
    earned,
    max: CHECKLIST_TOTAL_WEIGHT,
    pct: CHECKLIST_TOTAL_WEIGHT > 0 ? earned / CHECKLIST_TOTAL_WEIGHT : 0,
    anyMet,
  };
}
