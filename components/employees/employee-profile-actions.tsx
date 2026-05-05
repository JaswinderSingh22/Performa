"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";

import { deleteEmployee, updateEmployee } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmployeeRow } from "@/types/database";
import {
  employeeUpdateSchema,
  type EmployeeUpdateFormValues,
} from "@/validators/employee";

type TeamOption = { id: string; name: string };

function buildUpdateDefaults(employee: EmployeeRow): EmployeeUpdateFormValues {
  return {
    employeeId: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role ?? "",
    department: employee.department ?? "",
    team_name: employee.team_name ?? "",
    join_date:
      employee.join_date && employee.join_date !== ""
        ? employee.join_date
        : undefined,
  };
}

export function EmployeeProfileActions({
  employee,
  teams,
  departments,
}: {
  employee: EmployeeRow;
  teams: TeamOption[];
  departments: TeamOption[];
}): React.ReactElement {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const form = useForm<EmployeeUpdateFormValues>({
    resolver: zodResolver(employeeUpdateSchema),
    defaultValues: buildUpdateDefaults(employee),
  });

  React.useEffect(() => {
    if (!editOpen) return;
    form.reset(buildUpdateDefaults(employee));
  }, [employee, editOpen, form]);

  const onSubmitEdit = form.handleSubmit(async (values) => {
    const result = await updateEmployee(values);
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    setEditOpen(false);
    router.refresh();
  });

  const confirmDelete = async (): Promise<void> => {
    setDeleting(true);
    try {
      const result = await deleteEmployee({ employeeId: employee.id });
      if (!result.ok) {
        window.alert(result.error);
        setDeleting(false);
        return;
      }
      setDeleteOpen(false);
      router.push("/employees");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 rounded-lg shadow-sm"
        onClick={() => setEditOpen(true)}
      >
        <PencilIcon className="size-3.5" aria-hidden />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-destructive/30 text-destructive hover:bg-destructive/12 gap-1 rounded-lg shadow-sm"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2Icon className="size-3.5" aria-hidden />
        Delete
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmitEdit}>
            <DialogHeader>
              <DialogTitle>Edit employee</DialogTitle>
              <DialogDescription>
                Updates apply everywhere—in directory, dashboards, reviews, notes,
                and achievements.
              </DialogDescription>
            </DialogHeader>
            <input type="hidden" {...form.register("employeeId")} />
            <div className="grid gap-4 py-4">
              {form.formState.errors.root?.message ? (
                <p className="text-destructive text-sm" role="alert">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="edit-emp-name">Name</Label>
                <Input id="edit-emp-name" {...form.register("name")} />
                {form.formState.errors.name?.message ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-emp-email">Email</Label>
                <Input
                  id="edit-emp-email"
                  type="email"
                  autoComplete="email"
                  {...form.register("email")}
                />
                {form.formState.errors.email?.message ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-emp-role">Role</Label>
                  <Input id="edit-emp-role" {...form.register("role")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-emp-dept">Department</Label>
                  <select
                    id="edit-emp-dept"
                    className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                    {...form.register("department")}
                  >
                    <option value="">No department</option>
                    {employee.department?.trim() &&
                    !departments.some(
                      (department) =>
                        department.name.trim().toLowerCase() ===
                        employee.department?.trim().toLowerCase(),
                    ) ? (
                      <option value={employee.department.trim()}>
                        {employee.department.trim()} (legacy)
                      </option>
                    ) : null}
                    {departments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-emp-team">Team</Label>
                <select
                  id="edit-emp-team"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  {...form.register("team_name")}
                >
                  <option value="">No team</option>
                  {employee.team_name?.trim() &&
                  !teams.some(
                    (team) =>
                      team.name.trim().toLowerCase() ===
                      employee.team_name?.trim().toLowerCase(),
                  ) ? (
                    <option value={employee.team_name.trim()}>
                      {employee.team_name.trim()} (legacy)
                    </option>
                  ) : null}
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-emp-join">Join date</Label>
                <Input
                  id="edit-emp-join"
                  type="date"
                  {...form.register("join_date")}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {employee.name}?</DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              This deletes the employee profile and cascades{' '}
              <strong className="text-foreground font-medium">
                achievements, notes, reviews, and area scores
              </strong>{' '}
              for this person in your workspace. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className="gap-1"
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
