import { z } from "zod";

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(
    (s) => !Number.isNaN(Date.parse(`${s}T12:00:00.000Z`)),
    "Invalid calendar date",
  );

const periodBaseSchema = z.object({
  employeeId: z.uuid(),
  dateFrom: isoDateString,
  dateTo: isoDateString,
  title: z.string().trim().max(220).optional(),
});

export const assistReviewPeriodSchema = z
  .discriminatedUnion("strategy", [
    periodBaseSchema.extend({
      strategy: z.literal("raw_period"),
    }),
    periodBaseSchema.extend({
      strategy: z.literal("stitched_summaries"),
      sourceReviewIds: z.array(z.uuid()).min(1).max(12),
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.dateFrom > data.dateTo) {
      ctx.addIssue({
        code: "custom",
        message: "Range start must be on or before range end.",
        path: ["dateTo"],
      });
    }
  });

export type AssistReviewPeriodInput = z.infer<typeof assistReviewPeriodSchema>;
