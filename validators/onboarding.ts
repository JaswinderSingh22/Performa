import { z } from "zod";

import { MANAGER_COUNTRIES } from "@/lib/countries";

export const onboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters"),
  fullName: z.string().trim().min(1, "Enter your full name"),
  countryCode: z
    .string()
    .trim()
    .min(2, "Choose your country")
    .transform((v) => v.toUpperCase())
    .refine((code) => MANAGER_COUNTRIES.some((c) => c.code === code), {
      message: "Choose your country",
    }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Additional workspace creation (already has an account profile). */
export const createWorkspaceSchema = onboardingSchema.pick({
  organizationName: true,
  countryCode: true,
});
