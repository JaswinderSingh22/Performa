import { z } from "zod";

import { boundsForPeriodKey } from "@/lib/review-cadence";
import { PERFORMANCE_CHECKLIST } from "@/lib/review-checklist";

export const reviewStatusSchema = z.enum(["draft", "published", "archived"]);

const checklistZodShape = Object.fromEntries(
  PERFORMANCE_CHECKLIST.map((r) => [r.slug, z.boolean()]),
) as Record<string, z.ZodBoolean>;

export const reviewChecklistFormSchema = z
  .object(checklistZodShape)
  .partial()
  .default({});

export const reviewDimensionFormSchema = z.object({
  label: z.string().trim().min(1, "Each area needs a label").max(120),
  analysis: z.string().max(12000),
  rating: z.number().int().min(1).max(5),
});

export const reviewFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give this review a title")
      .max(220, "Keep the title concise"),
    status: reviewStatusSchema,
    rating: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return null;
        const n = typeof val === "number" ? val : Number(val);
        if (!Number.isInteger(n) || n < 1 || n > 5) return null;
        return n;
      },
      z.union([z.null(), z.number().int().min(1).max(5)]),
    ),
    dimensions: z.array(reviewDimensionFormSchema).max(24),
    checklist: reviewChecklistFormSchema,
    ai_draft: z.string().max(48000),
    final_review: z.string().max(48000),
    periodStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
    periodEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
    sourceReviewIds: z.array(z.uuid()).max(16).optional(),
    generationStrategy: z
      .enum(["raw_period", "stitched_summaries"])
      .optional(),
    reviewCadence: z
      .enum(["monthly", "quarterly", "mid_year", "yearly"])
      .optional(),
    periodKey: z.string().trim().max(48).optional(),
  })
  .refine(
    (data) =>
      data.status !== "published" || data.final_review.trim().length >= 15,
    {
      message:
        "Finalizing requires at least 15 characters of final summary.",
      path: ["final_review"],
    },
  )
  .superRefine((data, ctx) => {
    const strat = data.generationStrategy;
    const ps = data.periodStart;
    const pe = data.periodEnd;
    if (!strat) {
      if (
        ps !== undefined ||
        pe !== undefined ||
        (data.sourceReviewIds && data.sourceReviewIds.length > 0) ||
        data.reviewCadence !== undefined ||
        (data.periodKey !== undefined && data.periodKey !== "")
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Unset period fields unless you are saving a period-scoped generated review.",
          path: ["generationStrategy"],
        });
      }
      return;
    }
    if (!ps || !pe) {
      ctx.addIssue({
        code: "custom",
        message: "Period start and end are required for generated reviews.",
        path: ["periodStart"],
      });
      return;
    }
    if (ps > pe) {
      ctx.addIssue({
        code: "custom",
        message: "Period end must be on or after period start.",
        path: ["periodEnd"],
      });
    }
    if (strat === "stitched_summaries") {
      if (!data.sourceReviewIds || data.sourceReviewIds.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Select one or more quarterly reviews to stitch.",
          path: ["sourceReviewIds"],
        });
      }
    }
    if (
      strat === "raw_period" &&
      data.sourceReviewIds &&
      data.sourceReviewIds.length > 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Raw period reviews cannot list source reviews—clear them.",
        path: ["sourceReviewIds"],
      });
    }
    if (strat === "raw_period") {
      const cad = data.reviewCadence;
      const pk = data.periodKey?.trim();
      if (!cad || !pk) {
        ctx.addIssue({
          code: "custom",
          message:
            "Choose a period preset (cadence and dates) so reminders stay accurate.",
          path: ["periodKey"],
        });
        return;
      }
      const bounds = boundsForPeriodKey(cad, pk);
      if (!bounds || bounds.from !== ps || bounds.to !== pe) {
        ctx.addIssue({
          code: "custom",
          message: "Period dates must match the selected period preset.",
          path: ["periodStart"],
        });
      }
    }
    if (strat === "stitched_summaries" && data.periodKey && data.reviewCadence) {
      const pk = data.periodKey.trim();
      const cad = data.reviewCadence;
      const bounds = boundsForPeriodKey(cad, pk);
      if (bounds && (bounds.from !== ps || bounds.to !== pe)) {
        ctx.addIssue({
          code: "custom",
          message: "Period dates must match period key when both are set.",
          path: ["periodStart"],
        });
      }
    }
  });

export type ReviewFieldsFormValues = z.input<typeof reviewFieldsSchema>;

export const reviewCreateSchema = reviewFieldsSchema.extend({
  employeeId: z.uuid(),
});

export const reviewUpdateSchema = reviewFieldsSchema.extend({
  id: z.uuid(),
  employeeId: z.uuid(),
});

export const reviewDeleteSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
});

/** Promote a draft to published with server-side checks (final summary length, etc.). */
export const reviewPublishSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
});
