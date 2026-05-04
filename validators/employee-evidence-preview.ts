import { z } from "zod";

export const employeeEvidencePreviewSchema = z
  .object({
    employeeId: z.uuid(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  })
  .refine((d) => d.dateFrom <= d.dateTo, {
    message: "Range start must be on or before range end.",
    path: ["dateTo"],
  });
