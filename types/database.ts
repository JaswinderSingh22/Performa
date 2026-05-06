export type UserRole = "admin" | "manager";
export type ReviewStatus = "draft" | "published" | "archived";

export type ReviewGenerationStrategy = "raw_period" | "stitched_summaries";

export type ReviewCadence = "monthly" | "quarterly" | "mid_year" | "yearly";

export interface OrganizationRow {
  id: string;
  name: string;
  /** First auth user who created the workspace; always Org owner (Admin). */
  created_by: string | null;
  plan: string;
  country_code: string;
  billing_interval: "month" | "year" | null;
  subscription_status: string;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  subscription_current_end: string | null;
  review_cadence: ReviewCadence | null;
  quarter_start_month: number | null;
  created_at: string;
}

export interface UserProfileRow {
  id: string;
  org_id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface EmployeeRow {
  id: string;
  org_id: string;
  /** Company-facing employee identifier (not the UUID). */
  employee_code?: string | null;
  /** Manager reference within same org. */
  reporting_to_employee_id?: string | null;
  /** Resigned / inactive employees (kept for history). */
  is_active?: boolean | null;
  name: string;
  email: string;
  role: string;
  department: string;
  /** Squad or team label; empty string when unset. */
  team_name?: string | null;
  join_date: string | null;
  /** @deprecated Legacy single field; use employee_notes. */
  notes: string | null;
  /** Expected cycle generator cadence for reminder lists */
  review_cadence: ReviewCadence | null;
  created_at: string;
}

export interface TeamRow {
  id: string;
  org_id: string;
  name: string;
  department_id: string;
  created_at: string;
}

export interface DepartmentRow {
  id: string;
  org_id: string;
  name: string;
  review_cadence: ReviewCadence | null;
  quarter_start_month: number | null;
  created_at: string;
}

export interface EmployeeNoteRow {
  id: string;
  employee_id: string;
  org_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface AchievementRow {
  id: string;
  employee_id: string;
  org_id: string;
  title: string;
  description: string | null;
  category: string;
  achievement_date: string | null;
  created_at: string;
}

export interface ReviewDimensionRow {
  id: string;
  review_id: string;
  org_id: string;
  label: string;
  analysis: string;
  rating: number;
  sort_order: number;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  employee_id: string;
  org_id: string;
  /** Review cycle label; DB default applies if missing until migration ran */
  title: string | null;
  ai_draft: string | null;
  final_review: string | null;
  rating: number | null;
  status: ReviewStatus;
  /** Predefined checklist completion map keyed by checklist slug */
  checklist: Record<string, boolean> | null;
  /** Evidence window for AI-generated drafts (may be unset on legacy/manual rows). */
  period_start: string | null;
  period_end: string | null;
  /** Source reviews whose narratives were merged for token-efficient longer cycles. */
  source_review_ids: string[] | null;
  /** Cadence selected in the generator (or derived for stitched). */
  review_cadence: ReviewCadence | null;
  /** Canonical slot id, e.g. 2025-03, 2025-Q2, 2025-H1, 2025 */
  period_key: string | null;
  generation_strategy: ReviewGenerationStrategy | null;
  created_at: string;
}

/** When loading reviews with an embedded dimensions join */
export type ReviewWithDimensions = ReviewRow & {
  review_dimensions?: ReviewDimensionRow[];
};

/** Supabase error shape we map to user-facing messages */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
