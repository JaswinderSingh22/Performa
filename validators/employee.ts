import { z } from "zod";

const optionalDateString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

export const employeeCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.string().trim(),
  department: z.string().trim(),
  team_name: z.string().trim(),
  join_date: optionalDateString,
});

export type EmployeeCreateFormValues = z.input<typeof employeeCreateSchema>;

export type EmployeeCreateInput = z.output<typeof employeeCreateSchema>;

export const employeeUpdateSchema = employeeCreateSchema.extend({
  employeeId: z.uuid(),
});

export type EmployeeUpdateFormValues = z.input<typeof employeeUpdateSchema>;

export const employeeDeleteSchema = z.object({
  employeeId: z.uuid(),
});
