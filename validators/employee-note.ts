import { z } from "zod";

export const employeeNoteBodySchema = z
  .string()
  .trim()
  .min(1, "Note cannot be empty")
  .max(20000, "Keep notes under the limit");

export const employeeNoteFieldsSchema = z.object({
  body: employeeNoteBodySchema,
});

export type EmployeeNoteFieldsFormValues = z.input<
  typeof employeeNoteFieldsSchema
>;

export const employeeNoteCreateSchema = employeeNoteFieldsSchema.extend({
  employeeId: z.uuid(),
});

export const employeeNoteUpdateSchema = employeeNoteFieldsSchema.extend({
  id: z.uuid(),
  employeeId: z.uuid(),
});

export const employeeNoteDeleteSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
});
