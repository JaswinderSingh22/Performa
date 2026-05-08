import type { PlanId } from "@/lib/plans";
import { departmentReviewTemplatesEnabled, normalizePlan } from "@/lib/plans";
import { REVIEW_TEMPLATE_VERSION, type ReviewSelfTemplateDefinition } from "@/lib/reviews/review-template-definition";

export const REVIEW_TEMPLATE_PRESET_IDS = [
  "general",
  "engineering",
  "sales",
  "customer_success",
  "leadership",
] as const;

export type ReviewTemplatePresetId = (typeof REVIEW_TEMPLATE_PRESET_IDS)[number];

/** Human copy for cycle creation and settings. */
export const PRESET_CARD_COPY: Record<
  ReviewTemplatePresetId,
  { label: string; description: string; requiresPro: boolean }
> = {
  general: {
    label: "General",
    description: "Balanced questions for any role. Included on every plan.",
    requiresPro: false,
  },
  engineering: {
    label: "Engineering & product",
    description: "Delivery quality, technical ownership, and collaboration with design/PM.",
    requiresPro: true,
  },
  sales: {
    label: "Sales & GTM",
    description: "Pipeline, quota progress, customer conversations, and teamwork with CS/Marketing.",
    requiresPro: true,
  },
  customer_success: {
    label: "Customer success",
    description: "Account health, renewals, onboarding, and voice-of-customer themes.",
    requiresPro: true,
  },
  leadership: {
    label: "Leadership & management",
    description: "People development, strategy, stakeholder alignment, and org impact.",
    requiresPro: true,
  },
};

export function isPresetId(raw: string | null | undefined): raw is ReviewTemplatePresetId {
  return (
    typeof raw === "string" &&
    (REVIEW_TEMPLATE_PRESET_IDS as readonly string[]).includes(raw)
  );
}

export function normalizeStoredPreset(raw: unknown): ReviewTemplatePresetId {
  const s = typeof raw === "string" ? raw : "";
  return isPresetId(s) ? s : "general";
}

export function presetAvailableOnPlan(preset: ReviewTemplatePresetId, plan: PlanId): boolean {
  if (preset === "general") return true;
  return departmentReviewTemplatesEnabled(plan);
}

/** If the stored preset isn’t allowed on the org plan, fall back to general. */
export function coercePresetForPlan(
  preset: ReviewTemplatePresetId,
  plan: PlanId,
): ReviewTemplatePresetId {
  return presetAvailableOnPlan(preset, plan) ? preset : "general";
}

export function listPresetOptionsForPlan(plan: PlanId): Array<{
  id: ReviewTemplatePresetId;
  label: string;
  description: string;
}> {
  const p = normalizePlan(plan);
  return REVIEW_TEMPLATE_PRESET_IDS.filter((id) => presetAvailableOnPlan(id, p)).map((id) => ({
    id,
    label: PRESET_CARD_COPY[id].label,
    description: PRESET_CARD_COPY[id].description,
  }));
}

function sectionsFrom(
  overrides: Partial<
    Record<
      ReviewSelfTemplateDefinition["sections"][number]["key"],
      { title?: string; description?: string; placeholder?: string; required?: boolean }
    >
  >,
  base: ReviewSelfTemplateDefinition,
): ReviewSelfTemplateDefinition["sections"] {
  return base.sections.map((s) => ({
    ...s,
    ...overrides[s.key],
  }));
}

function baseFromGeneral(): ReviewSelfTemplateDefinition {
  return {
    version: REVIEW_TEMPLATE_VERSION,
    show_self_rating: true,
    self_rating_title: "How would you rate your overall performance this period?",
    self_rating_description:
      "A concise self-assessment helps your manager calibrate the final review.",
    sections: [
      {
        key: "highlights",
        title: "What went well this period?",
        description: "Wins, milestones, and outcomes you are proud of.",
        placeholder:
          "e.g. Shipped the onboarding revamp, improved test coverage on the billing module…",
        required: true,
      },
      {
        key: "challenges",
        title: "What was challenging or slowed you down?",
        description: "Be specific—this helps prioritize support and process fixes.",
        placeholder: "e.g. Ambiguous specs on X, dependency on another team’s timeline…",
        required: false,
      },
      {
        key: "goals_next_period",
        title: "Goals for the next period",
        description: "Concrete outcomes, skills, or habits you will focus on.",
        placeholder: "e.g. Lead migration Y, reduce incident MTTR, deepen domain in Z…",
        required: false,
      },
      {
        key: "collaboration_note",
        title: "Collaboration and teamwork",
        description: "How you worked with peers, partners, and stakeholders.",
        placeholder:
          "e.g. Paired with design on dashboards, improved async updates in standups…",
        required: false,
      },
      {
        key: "growth_areas",
        title: "Growth and development",
        description: "Skills or responsibilities you want to build next.",
        placeholder: "e.g. System design, facilitation, mentoring juniors…",
        required: false,
      },
      {
        key: "support_needed",
        title: "Support you need from the org",
        description: "Resources, clarity, or sponsorship that would help you succeed.",
        placeholder: "e.g. Access to a mentor, clearer priorities, budget for training…",
        required: false,
      },
    ],
  };
}

/** Built-in preset questionnaires (same DB fields; different prompts). */
export const PRESET_DEFINITIONS: Record<ReviewTemplatePresetId, ReviewSelfTemplateDefinition> = (() => {
  const g = baseFromGeneral();

  const engineering: ReviewSelfTemplateDefinition = {
    version: REVIEW_TEMPLATE_VERSION,
    show_self_rating: true,
    self_rating_title: "How do you rate your technical impact and delivery this period?",
    self_rating_description: "Consider quality, reliability, and mentoring—not just output volume.",
    sections: sectionsFrom(
      {
        highlights: {
          title: "Technical and product outcomes",
          description: "Features shipped, reliability gains, performance, or debt you paid down.",
          placeholder:
            "e.g. Cut p95 latency by 40%, launched feature flags, stabilized CI pipeline…",
          required: true,
        },
        challenges: {
          title: "Technical or process blockers",
          description: "Ambiguity, dependencies, incidents, or toolchain pain.",
          placeholder: "e.g. Flaky tests, unclear API contracts, cross-team handoff delays…",
        },
        goals_next_period: {
          title: "Engineering goals for next period",
          description: "Design, quality, security, or scalability you will drive.",
          placeholder: "e.g. Own service boundary X, improve observability, RFC for Y…",
        },
        collaboration_note: {
          title: "Collaboration (PM, design, support, peers)",
          description: "How you partnered across functions to deliver.",
          placeholder:
            "e.g. Aligned with PM on scope, paired with design on edge cases…",
        },
        growth_areas: {
          title: "Skills you want to deepen",
          description: "Architecture, tooling, leadership in technical decisions, etc.",
          placeholder: "e.g. Distributed systems, LLM product patterns, incident command…",
        },
        support_needed: {
          title: "What would help you ship better?",
          description: "Staffing, tooling, access, or process changes.",
          placeholder: "e.g. Dedicated QA window, design system updates, clearer SLOs…",
        },
      },
      g,
    ),
  };

  const sales: ReviewSelfTemplateDefinition = {
    version: REVIEW_TEMPLATE_VERSION,
    show_self_rating: true,
    self_rating_title: "How do you rate your sales performance against expectations?",
    self_rating_description: "Pipeline quality, activity, and outcomes you owned.",
    sections: sectionsFrom(
      {
        highlights: {
          title: "Wins on the number and in the field",
          description: "Deals closed, pipeline created, key accounts advanced.",
          placeholder:
            "e.g. Closed ACME expansion, built a healthy top-of-funnel in retail vertical…",
          required: true,
        },
        challenges: {
          title: "Deal and market challenges",
          description: "Lost deals, stalled cycles, competitive pressure, internal friction.",
          placeholder: "e.g. Budget freezes in region X, long legal review on Y…",
        },
        goals_next_period: {
          title: "Quota and pipeline goals ahead",
          description: "Specific revenue, activity, or territory goals.",
          placeholder: "e.g. 120% of quota, 3 new logos in healthcare, improve win rate on Z…",
        },
        collaboration_note: {
          title: "Collaboration with CS, marketing, and product",
          description: "Handoffs, campaigns, and feedback loops that helped or hurt.",
          placeholder: "e.g. Weekly sync with CS on renewals, co-built case study with marketing…",
        },
        growth_areas: {
          title: "Selling skills to sharpen",
          description: "Discovery, negotiation, forecasting, or vertical expertise.",
          placeholder: "e.g. Multi-threading enterprise deals, MEDDPICC depth, demo storytelling…",
        },
        support_needed: {
          title: "Enablement and support requests",
          description: "Collateral, training, tools, or exec sponsorship you need.",
          placeholder: "e.g. Battlecards for competitor A, clearer discount policy, SE coverage…",
        },
      },
      g,
    ),
  };

  const customer_success: ReviewSelfTemplateDefinition = {
    version: REVIEW_TEMPLATE_VERSION,
    show_self_rating: true,
    self_rating_title: "How do you rate your impact on customer outcomes?",
    self_rating_description: "Retention, adoption, and trust you helped build.",
    sections: sectionsFrom(
      {
        highlights: {
          title: "Customer outcomes you drove",
          description: "Renewals saved, expansions, health score improvements, onboarding wins.",
          placeholder:
            "e.g. Pulled at-risk account X back to green, shortened time-to-value on Y…",
          required: true,
        },
        challenges: {
          title: "Risky accounts and tough situations",
          description: "Escalations, churn signals, product gaps, or capacity issues.",
          placeholder: "e.g. Key champion left, integration fragility on legacy stack…",
        },
        goals_next_period: {
          title: "Goals for NRR, adoption, or efficiency",
          description: "Portfolio or book-of-business priorities for next period.",
          placeholder: "e.g. Raise feature adoption of Z to 80%, reduce time-to-first-value…",
        },
        collaboration_note: {
          title: "Working with sales, product, and support",
          description: "Feedback loops, QBRs, and cross-functional follow-through.",
          placeholder: "e.g. Fed product 5 churn themes, partnered with sales on handoff checklist…",
        },
        growth_areas: {
          title: "CS craft you want to strengthen",
          description: "Executive communication, analytics, project management, etc.",
          placeholder: "e.g. Commercial conversations, SQL for health scoring, facilitation…",
        },
        support_needed: {
          title: "What the org can do for your customers",
          description: "Roadmap, docs, services, or tooling that would move the needle.",
          placeholder: "e.g. Faster bug fix SLA, admin bulk tools, clearer escalation path…",
        },
      },
      g,
    ),
  };

  const leadership: ReviewSelfTemplateDefinition = {
    version: REVIEW_TEMPLATE_VERSION,
    show_self_rating: true,
    self_rating_title: "How do you assess your leadership effectiveness this period?",
    self_rating_description: "People, strategy, and delivery through others.",
    sections: sectionsFrom(
      {
        highlights: {
          title: "Impact on team and organisation",
          description: "Goals met, talent developed, culture, and cross-org outcomes.",
          placeholder:
            "e.g. Reduced attrition on team, delivered OKR set, improved hiring bar…",
          required: true,
        },
        challenges: {
          title: "Leadership challenges",
          description: "Difficult trade-offs, stakeholder tension, or organisational drag.",
          placeholder: "e.g. Re-org uncertainty, underperforming initiative, capacity crunch…",
        },
        goals_next_period: {
          title: "Leadership priorities ahead",
          description: "Org design, strategy, people plans, or operational excellence.",
          placeholder: "e.g. Build succession for role X, clarify decision rights, scale ritual Y…",
        },
        collaboration_note: {
          title: "Stakeholders and peer leadership",
          description: "Alignment with exec peers, partners, and other teams.",
          placeholder: "e.g. Quarterly planning with finance, joint OKRs with product…",
        },
        growth_areas: {
          title: "Where you are growing as a leader",
          description: "Communication, coaching, systems thinking, executive presence.",
          placeholder: "e.g. Difficult feedback, delegating strategic work, board readiness…",
        },
        support_needed: {
          title: "Executive and org support",
          description: "Air cover, clarity, or resources you need from above or sideways.",
          placeholder: "e.g. Sponsor for headcount, exec alignment on strategy, coach/mentor…",
        },
      },
      g,
    ),
  };

  return {
    general: g,
    engineering,
    sales,
    customer_success,
    leadership,
  };
})();

export function definitionForPreset(preset: ReviewTemplatePresetId): ReviewSelfTemplateDefinition {
  return PRESET_DEFINITIONS[preset] ?? PRESET_DEFINITIONS.general;
}

export function definitionForCyclePresetAndPlan(
  presetRaw: unknown,
  planRaw: string | null | undefined,
): ReviewSelfTemplateDefinition {
  const plan = normalizePlan(planRaw);
  const stored = normalizeStoredPreset(presetRaw);
  const preset = coercePresetForPlan(stored, plan);
  return definitionForPreset(preset);
}

export function labelForPreset(preset: ReviewTemplatePresetId): string {
  return PRESET_CARD_COPY[preset].label;
}
