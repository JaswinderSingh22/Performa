import { z } from "zod";

const teamNameSchema = z
  .string()
  .trim()
  .min(2, "Team name must be at least 2 characters.")
  .max(60, "Team name is too long.");

export const teamCreateSchema = z.object({
  name: teamNameSchema,
  departmentId: z.uuid(),
});

export const teamRenameSchema = z.object({
  teamId: z.uuid(),
  name: teamNameSchema,
});

export const teamDeleteSchema = z.object({
  teamId: z.uuid(),
});

export const teamDepartmentAssignmentSchema = z.object({
  teamId: z.uuid(),
  departmentId: z.uuid(),
});

export const employeeTeamAssignmentSchema = z.object({
  employeeId: z.uuid(),
  teamId: z.uuid().nullable(),
});

export const departmentCreateSchema = z.object({
  name: teamNameSchema,
});

export const departmentRenameSchema = z.object({
  departmentId: z.uuid(),
  name: teamNameSchema,
});

export const departmentDeleteSchema = z.object({
  departmentId: z.uuid(),
});

export const departmentReviewCycleSchema = z.object({
  departmentId: z.uuid(),
  reviewCadence: z.enum(["monthly", "quarterly", "mid_year", "yearly"]),
  quarterStartMonth: z.number().int().min(1).max(12),
});

export const employeeDepartmentAssignmentSchema = z.object({
  employeeId: z.uuid(),
  departmentId: z.uuid().nullable(),
});
