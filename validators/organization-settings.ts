import { z } from "zod";

export const organizationRenameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Workspace name is required")
    .max(160, "Keep the name concise"),
});

export type OrganizationRenameInput = z.infer<typeof organizationRenameSchema>;
