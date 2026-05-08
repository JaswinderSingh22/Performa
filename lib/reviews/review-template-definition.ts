import type { PlanId } from "@/lib/plans";
import { departmentReviewTemplatesEnabled } from "@/lib/plans";

export const REVIEW_TEMPLATE_VERSION = 1 as const;

/** Keys map 1:1 to `employee_self_reviews` text columns. */
export const SELF_REVIEW_SECTION_KEYS = [
  "highlights",
  "challenges",
  "goals_next_period",
  "collaboration_note",
  "growth_areas",
  "support_needed",
] as const;

export type SelfReviewSectionKey = (typeof SELF_REVIEW_SECTION_KEYS)[number];

export type ReviewSelfTemplateSectionSpec = {
  key: SelfReviewSectionKey;
  /** Hide from employee + manager section UI (values stay empty). */
  hidden?: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
};

export type ReviewSelfTemplateDefinition = {
  version: typeof REVIEW_TEMPLATE_VERSION;
  sections: ReviewSelfTemplateSectionSpec[];
  show_self_rating?: boolean;
  self_rating_title?: string;
  self_rating_description?: string;
};

type BaselineSection = {
  key: SelfReviewSectionKey;
  emoji: string;
  title: string;
  description: string;
  placeholder: string;
  required: boolean;
};

const BASELINE: BaselineSection[] = [
  {
    key: "highlights",
    emoji: "✅",
    title: "What went well this period?",
    description:
      "Share your key wins, successful projects, or moments you're proud of.",
    placeholder:
      "e.g. Successfully delivered the new onboarding flow on time, helped unblock the team on the API migration…",
    required: true,
  },
  {
    key: "challenges",
    emoji: "⚡",
    title: "What was challenging or blocked you?",
    description: "Honest reflection helps your manager understand what support you need.",
    placeholder:
      "e.g. Had difficulty with unclear requirements on project X, struggled to balance multiple priorities…",
    required: false,
  },
  {
    key: "goals_next_period",
    emoji: "🎯",
    title: "What are your goals for the next period?",
    description: "Be specific. Think about deliverables, skills, and team contributions.",
    placeholder:
      "e.g. Complete certification in Y, improve code review turnaround, lead the Z feature end-to-end…",
    required: false,
  },
  {
    key: "collaboration_note",
    emoji: "🤝",
    title: "How was collaboration with the team?",
    description: "Reflect on your teamwork, communication, and cross-functional interactions.",
    placeholder:
      "e.g. Great coordination with design on the new dashboard, could have communicated blockers earlier…",
    required: false,
  },
  {
    key: "growth_areas",
    emoji: "🌱",
    title: "What areas do you want to grow in?",
    description: "Skills, behaviours, or responsibilities you'd like to develop.",
    placeholder: "e.g. System design, public speaking, taking ownership of larger features…",
    required: false,
  },
  {
    key: "support_needed",
    emoji: "🙋",
    title: "Do you need any support or resources?",
    description: "Anything your manager or the company can do to help you succeed.",
    placeholder: "e.g. Mentoring on architecture decisions, clearer sprint goals, more 1:1 time…",
    required: false,
  },
];

export function builtinDefaultDefinition(): ReviewSelfTemplateDefinition {
  return {
    version: REVIEW_TEMPLATE_VERSION,
    show_self_rating: true,
    self_rating_title: "How would you rate your overall performance?",
    self_rating_description:
      "A honest self-assessment helps calibrate the final review.",
    sections: BASELINE.map((b) => ({
      key: b.key,
      title: b.title,
      description: b.description,
      placeholder: b.placeholder,
      required: b.required,
    })),
  };
}

function keySetFromUnknown(raw: unknown): Set<SelfReviewSectionKey> {
  const out = new Set<SelfReviewSectionKey>();
  if (!raw || typeof raw !== "object") return out;
  const arr = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(arr)) return out;
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const k = (row as { key?: string }).key;
    if (SELF_REVIEW_SECTION_KEYS.includes(k as SelfReviewSectionKey)) {
      out.add(k as SelfReviewSectionKey);
    }
  }
  return out;
}

/** Accepts JSON from DB; falls back to built-in when empty or invalid. */
export function parseReviewTemplateDefinition(raw: unknown): ReviewSelfTemplateDefinition {
  const base = builtinDefaultDefinition();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (Number(o.version) !== REVIEW_TEMPLATE_VERSION && o.version !== undefined) {
    return base;
  }
  const keysFromJson = keySetFromUnknown(raw);
  if (keysFromJson.size === 0) return base;

  const sections: ReviewSelfTemplateSectionSpec[] = [];
  for (const b of BASELINE) {
    if (!keysFromJson.has(b.key)) continue;
    const override = (o.sections as ReviewSelfTemplateSectionSpec[] | undefined)?.find(
      (s) => s.key === b.key,
    );
    sections.push({
      key: b.key,
      hidden: override?.hidden === true,
      title: typeof override?.title === "string" && override.title.trim() ? override.title : b.title,
      description:
        typeof override?.description === "string" && override.description.trim()
          ? override.description
          : b.description,
      placeholder:
        typeof override?.placeholder === "string" && override.placeholder.trim()
          ? override.placeholder
          : b.placeholder,
      required: typeof override?.required === "boolean" ? override.required : b.required,
    });
  }

  const showSelf =
    typeof o.show_self_rating === "boolean" ? o.show_self_rating : base.show_self_rating;

  return {
    version: REVIEW_TEMPLATE_VERSION,
    sections,
    show_self_rating: showSelf !== false,
    self_rating_title:
      typeof o.self_rating_title === "string" && o.self_rating_title.trim()
        ? o.self_rating_title
        : base.self_rating_title,
    self_rating_description:
      typeof o.self_rating_description === "string" && o.self_rating_description.trim()
        ? o.self_rating_description
        : base.self_rating_description,
  };
}

export type SelfReviewFormQuestion = {
  key: SelfReviewSectionKey;
  emoji: string;
  label: string;
  sublabel: string;
  placeholder: string;
  required: boolean;
};

/** Questions for rendering the public wizard (drops hidden sections). */
export function definitionToSelfReviewQuestions(
  definition: ReviewSelfTemplateDefinition,
): SelfReviewFormQuestion[] {
  const baselineByKey = new Map(BASELINE.map((b) => [b.key, b]));
  const qs: SelfReviewFormQuestion[] = [];
  for (const s of definition.sections) {
    if (s.hidden) continue;
    const base = baselineByKey.get(s.key)!;
    qs.push({
      key: s.key,
      emoji: base.emoji,
      label: s.title ?? base.title,
      sublabel: s.description ?? base.description,
      placeholder: s.placeholder ?? base.placeholder,
      required: Boolean(s.required),
    });
  }
  return qs;
}

export function normalizeDepartmentKey(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function cloneDefinitionForUpsert(def: ReviewSelfTemplateDefinition): object {
  return JSON.parse(JSON.stringify(def)) as object;
}

export function shouldSkipTemplateProvisioning(plan: PlanId): boolean {
  return !departmentReviewTemplatesEnabled(plan);
}

/** Whether the employee-visible section appears in forms (manager + self-review UI). */
export function isEmployeeSectionShown(
  definition: ReviewSelfTemplateDefinition,
  key: SelfReviewSectionKey,
): boolean {
  const row = definition.sections.find((s) => s.key === key);
  if (!row) return false;
  return row.hidden !== true;
}

export function validateSelfReviewPayloadAgainstDefinition(args: {
  definition: ReviewSelfTemplateDefinition;
  highlights: string;
  challenges: string;
  goals_next_period: string;
  collaboration_note: string;
  growth_areas: string;
  support_needed: string;
  self_rating: number | null;
}): string | null {
  const fields: Record<SelfReviewSectionKey, string> = {
    highlights: args.highlights,
    challenges: args.challenges,
    goals_next_period: args.goals_next_period,
    collaboration_note: args.collaboration_note,
    growth_areas: args.growth_areas,
    support_needed: args.support_needed,
  };
  const qs = definitionToSelfReviewQuestions(args.definition);
  for (const q of qs) {
    if (!q.required) continue;
    if (!fields[q.key].trim()) {
      return `Please complete "${q.label}".`;
    }
  }
  const showRating = args.definition.show_self_rating !== false;
  if (showRating && (args.self_rating === null || args.self_rating === undefined)) {
    return "Please choose a self rating for this period.";
  }
  return null;
}
