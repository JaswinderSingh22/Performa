"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, MailIcon, PencilIcon, SaveIcon, Trash2Icon } from "lucide-react";

import { deleteEmployee, updateEmployee } from "@/actions/employees";
import { inviteEmployeeToWorkspace, setEmployeeWorkspaceAccess } from "@/actions/employee-access";
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
type AccessSelection = "none" | "admin" | "hr" | "manager" | "tl";

function normalizeAccessSelection(value: string | null | undefined): AccessSelection {
  if (value === "admin" || value === "hr" || value === "manager" || value === "tl") {
    return value;
  }
  return "none";
}

function buildUpdateDefaults(employee: EmployeeRow): EmployeeUpdateFormValues {
  return {
    employeeId: employee.id,
    name: employee.name,
    email: employee.email,
    employee_code: employee.employee_code ?? "",
    role: employee.role ?? "",
    department: employee.department ?? "",
    team_name: employee.team_name ?? "",
    join_date:
      employee.join_date && employee.join_date !== ""
        ? employee.join_date
        : undefined,
    is_active: employee.is_active !== false,
  };
}

export function EmployeeProfileActions({
  employee,
  teams,
  departments,
  readOnly = false,
  accessRole,
  accessInvitedAt,
  currentUserRole,
}: {
  employee: EmployeeRow;
  teams: TeamOption[];
  departments: TeamOption[];
  readOnly?: boolean;
  accessRole?: string | null;
  accessInvitedAt?: string | null;
  /** The role of the currently logged-in user — restricts which access roles they can grant. */
  currentUserRole?: string | null;
}): React.ReactElement {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [inviteLoading, setInviteLoading] = React.useState(false);
  const [saveAccessLoading, setSaveAccessLoading] = React.useState(false);
  const [accessError, setAccessError] = React.useState<string | null>(null);
  const [accessSelection, setAccessSelection] = React.useState<AccessSelection>(
    normalizeAccessSelection(accessRole),
  );

  const form = useForm<EmployeeUpdateFormValues>({
    resolver: zodResolver(employeeUpdateSchema),
    defaultValues: buildUpdateDefaults(employee),
  });

  React.useEffect(() => {
    if (!editOpen) return;
    form.reset(buildUpdateDefaults(employee));
    setAccessError(null);
    setAccessSelection(normalizeAccessSelection(accessRole));
  }, [accessRole, employee, editOpen, form]);

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
        disabled={readOnly}
        title={
          readOnly
            ? "This employee is locked because your workspace is over the seat limit."
            : undefined
        }
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
        disabled={readOnly}
        title={
          readOnly
            ? "This employee is locked because your workspace is over the seat limit."
            : undefined
        }
      >
        <Trash2Icon className="size-3.5" aria-hidden />
        Delete
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden">
          <form onSubmit={onSubmitEdit} className="flex max-h-[calc(85vh-2rem)] flex-col">
            <DialogHeader>
              <DialogTitle>Edit employee</DialogTitle>
              <DialogDescription>
                Updates apply everywhere—in directory, dashboards, reviews, notes,
                and achievements.
              </DialogDescription>
            </DialogHeader>
            <input type="hidden" {...form.register("employeeId")} />
            <div className="grid flex-1 gap-4 overflow-y-auto py-4 pr-1">
              {form.formState.errors.root?.message ? (
                <p className="text-destructive text-sm" role="alert">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
              {accessError ? (
                <p className="text-destructive text-sm" role="alert">
                  {accessError}
                </p>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="edit-emp-code">Employee ID</Label>
                <Input
                  id="edit-emp-code"
                  placeholder="E.g. EMP-1024"
                  {...form.register("employee_code")}
                />
              </div>
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
                  <Label htmlFor="edit-emp-role">Position</Label>
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
              <div className="rounded-xl border border-border/80 bg-muted/25 p-4 space-y-4">
                <div>
                  <Label htmlFor="edit-emp-access" className="text-foreground font-medium">
                    Workspace access
                  </Label>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {accessInvitedAt
                      ? "An invite email was sent. Use resend only if they did not receive it."
                      : "Choose a role, send an invite to create or link their login, or update role only after they are linked."}
                  </p>
                </div>

                <select
                  id="edit-emp-access"
                  className="border-input bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm"
                  value={accessSelection}
                  disabled={readOnly || inviteLoading || saveAccessLoading}
                  onChange={(e) =>
                    setAccessSelection(
                      e.target.value as "none" | "admin" | "hr" | "manager" | "tl",
                    )
                  }
                >
                  <option value="none">No login access</option>
                  <option value="tl">TL</option>
                  <option value="manager">Manager</option>
                  {(currentUserRole === "admin" || currentUserRole === "hr") && (
                    <>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                </select>

                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-center gap-2 border-primary/25 bg-background font-medium"
                    disabled={
                      readOnly ||
                      inviteLoading ||
                      saveAccessLoading ||
                      accessSelection === "none"
                    }
                    onClick={() => {
                      if (accessSelection === "none") return;
                      setAccessError(null);
                      setInviteLoading(true);
                      void (async () => {
                        const res = await inviteEmployeeToWorkspace({
                          employeeId: employee.id,
                          role: accessSelection,
                        });
                        setInviteLoading(false);
                        if (!res.ok) {
                          setAccessError(res.error);
                          return;
                        }
                        router.refresh();
                      })();
                    }}
                  >
                    {inviteLoading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <MailIcon className="size-4 shrink-0" />
                    )}
                    {accessInvitedAt ? "Resend invite email" : "Send invite email"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 w-full justify-center gap-2 font-medium"
                    disabled={readOnly || inviteLoading || saveAccessLoading}
                    onClick={() => {
                      setAccessError(null);
                      setSaveAccessLoading(true);
                      void (async () => {
                        const res = await setEmployeeWorkspaceAccess({
                          employeeId: employee.id,
                          role: accessSelection,
                        });
                        setSaveAccessLoading(false);
                        if (!res.ok) {
                          setAccessError(res.error);
                          return;
                        }
                        router.refresh();
                      })();
                    }}
                  >
                    {saveAccessLoading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <SaveIcon className="size-4 shrink-0" />
                    )}
                    Update role (no email)
                  </Button>
                </div>

                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  <strong className="text-foreground/90 font-medium">Send invite</strong> triggers
                  Supabase invite or links an existing Auth user by email.
                  <strong className="text-foreground/90 font-medium"> Update role</strong> skips email
                  and only updates workspace membership once a user exists.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-emp-status">Status</Label>
                <select
                  id="edit-emp-status"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  {...form.register("is_active")}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive (resigned)</option>
                </select>
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
            <DialogFooter className="sticky bottom-0 mt-2 gap-2 border-t border-border/60 bg-background/80 pt-3 backdrop-blur">
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
