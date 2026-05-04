import { z } from "zod";

export const onboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters"),
  fullName: z.string().trim().min(1, "Enter your full name"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
