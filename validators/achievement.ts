import { z } from "zod";

const optionalDateString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const optionalText = z
  .string()
  .optional()
  .transform((v) => {
    const t = v?.trim();
    return t !== undefined && t.length > 0 ? t : undefined;
  });

export const achievementFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: optionalText,
  category: z.string().trim().min(1, "Category is required"),
  achievement_date: optionalDateString,
});

export type AchievementFieldsFormValues = z.input<
  typeof achievementFieldsSchema
>;

export type AchievementFieldsInput = z.output<typeof achievementFieldsSchema>;

export const achievementCreateSchema = achievementFieldsSchema.extend({
  employeeId: z.uuid(),
});

export type AchievementCreateInput = z.infer<typeof achievementCreateSchema>;

export const achievementUpdateSchema = achievementFieldsSchema.extend({
  id: z.uuid(),
  employeeId: z.uuid(),
});

export type AchievementUpdateInput = z.infer<typeof achievementUpdateSchema>;

export const achievementIdSchema = z.object({
  id: z.uuid(),
});

export const achievementDeleteSchema = achievementIdSchema.extend({
  employeeId: z.uuid(),
});
