export type UserRole = "admin" | "hr" | "manager" | "tl";
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

export interface UserProfileGlobalRow {
  user_id: string;
  full_name: string;
  email: string | null;
  created_at: string;
}

export interface WorkspaceMemberRow {
  org_id: string;
  user_id: string;
  role: UserRole;
  employee_id: string | null;
  invited_at?: string | null;
  joined_at?: string | null;
  created_at: string;
}

export interface EmployeeRow {
  id: string;
  org_id: string;
  /** Company-facing employee identifier (not the UUID). */
  employee_code?: string | null;
  /** Direct manager in the HR directory (separate from team record manager). */
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
  manager_employee_id?: string | null;
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

// ─── Review Cycles ──────────────────────────────────────────────────────────

export type ReviewCycleStatus = "draft" | "open" | "reviewing" | "closed";

export interface ReviewSelfTemplateRow {
  id: string;
  org_id: string;
  department_id: string | null;
  name: string;
  definition: unknown;
  created_at: string;
  updated_at: string;
}

export interface ReviewCycleRow {
  id: string;
  org_id: string;
  title: string;
  cadence: ReviewCadence;
  period_start: string;
  period_end: string;
  self_review_due: string | null;
  status: ReviewCycleStatus;
  /** Built-in questionnaire preset chosen when the cycle was created. */
  self_review_template_preset?: string;
  /** Null = open for all active employees; else only employees.team_name matches. */
  scoped_team_names?: string[] | null;
  /** Union with team scope: employees whose directory department is in these squads. */
  scoped_department_ids?: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SelfReviewStatus = "pending" | "submitted" | "late";

/** Linear review pipeline for an employee in a cycle (see review_workflow_hr migration). */
export type ReviewWorkflowStatus =
  | "draft"
  | "employee_submitted"
  | "hr_review_pending"
  | "revision_requested"
  | "finalized";

export interface EmployeeSelfReviewRow {
  id: string;
  review_cycle_id: string;
  employee_id: string;
  org_id: string;
  /** Legacy: optional FK to custom row; self-review copy is driven by the cycle’s questionnaire preset. */
  template_id?: string | null;
  highlights: string;
  challenges: string;
  goals_next_period: string;
  collaboration_note: string;
  growth_areas: string;
  support_needed: string;
  self_rating: number | null;
  status: SelfReviewStatus;
  submitted_at: string | null;
  form_token: string | null;
  /** Populated after review_workflow_hr migration (default draft). */
  workflow_status?: ReviewWorkflowStatus | null;
  hr_remarks?: string | null;
  hr_rejection_reason?: string | null;
  finalized_at?: string | null;
  finalized_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ManagerRemarksStatus = "draft" | "submitted" | "approved" | "archived";

export interface ReviewManagerRemarksRow {
  id: string;
  self_review_id: string;
  employee_id: string;
  review_cycle_id: string;
  org_id: string;
  manager_user_id: string | null;
  highlights_remark: string;
  challenges_remark: string;
  goals_remark: string;
  growth_remark: string;
  final_remark: string;
  overall_rating: number | null;
  ai_suggested_summary: string | null;
  status: ManagerRemarksStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Supabase error shape we map to user-facing messages */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
