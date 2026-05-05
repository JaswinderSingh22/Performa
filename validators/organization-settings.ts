import { z } from "zod";

export const organizationRenameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Workspace name is required")
    .max(160, "Keep the name concise"),
});

export type OrganizationRenameInput = z.infer<typeof organizationRenameSchema>;

export const organizationReviewCycleSchema = z.object({
  reviewCadence: z.enum(["monthly", "quarterly", "mid_year", "yearly"]),
  quarterStartMonth: z.number().int().min(1).max(12),
});
