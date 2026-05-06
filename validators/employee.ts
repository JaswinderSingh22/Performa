import { z } from "zod";

const optionalDateString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : ""));

const booleanFromForm = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return v;
}, z.boolean());

export const employeeCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  employee_code: z.string().trim().min(1, "Employee ID is required"),
  role: z.string().trim(),
  department: z.string().trim(),
  team_name: z.string().trim(),
  join_date: optionalDateString,
  reporting_to_employee_code: optionalTrimmedString,
  is_active: booleanFromForm.default(true),
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
