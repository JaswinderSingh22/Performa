import { z } from "zod";

import { nonEmptyStringSchema } from "@/validators/common";

export const profileUpdateSchema = z.object({
  fullName: nonEmptyStringSchema.max(160),
  jobTitle: z.string().trim().max(160),
  department: z.string().trim().max(160),
  bio: z.string().trim().max(2000),
  yearsExperience: z
    .union([
      z.null(),
      z.undefined(),
      z
        .number()
        .finite({ message: "Enter a valid number of years." })
        .min(0)
        .max(60),
    ])
    .transform((v): number | null => (v === undefined ? null : v)),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
