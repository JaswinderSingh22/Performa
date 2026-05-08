"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, MailIcon, SaveIcon } from "lucide-react";

import { updateEmployee } from "@/actions/employees";
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
import { employeeUpdateSchema, type EmployeeUpdateFormValues } from "@/validators/employee";

type AccessSelection = "none" | "admin" | "hr" | "manager" | "tl";

function normalizeAccess(value: string | null | undefined): AccessSelection {
  if (value === "admin" || value === "hr" || value === "manager" || value === "tl") return value;
  return "none";
}

export function InlineEditEmployeeDialog({
  employee,
  teams,
  departments,
  accessRole,
  accessInvitedAt,
  currentUserRole,
  open,
  onClose,
}: {
  employee: EmployeeRow;
  teams: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  accessRole?: string | null;
  accessInvitedAt?: string | null;
  currentUserRole?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [inviteLoading, setInviteLoading] = React.useState(false);
  const [saveAccessLoading, setSaveAccessLoading] = React.useState(false);
  const [accessError, setAccessError] = React.useState<string | null>(null);
  const [accessSelection, setAccessSelection] = React.useState<AccessSelection>(
    normalizeAccess(accessRole),
  );

  const form = useForm<EmployeeUpdateFormValues>({
    resolver: zodResolver(employeeUpdateSchema),
    defaultValues: {
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      employee_code: employee.employee_code ?? "",
      role: employee.role ?? "",
      department: employee.department ?? "",
      team_name: employee.team_name ?? "",
      join_date: employee.join_date && employee.join_date !== "" ? employee.join_date : undefined,
      is_active: employee.is_active !== false,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      employee_code: employee.employee_code ?? "",
      role: employee.role ?? "",
      department: employee.department ?? "",
      team_name: employee.team_name ?? "",
      join_date: employee.join_date && employee.join_date !== "" ? employee.join_date : undefined,
      is_active: employee.is_active !== false,
    });
    setAccessError(null);
    setAccessSelection(normalizeAccess(accessRole));
  }, [employee, accessRole, open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await updateEmployee(values);
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    onClose();
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden">
        <form onSubmit={onSubmit} className="flex max-h-[calc(85vh-2rem)] flex-col">
          <DialogHeader>
            <DialogTitle>Edit employee</DialogTitle>
            <DialogDescription>
              Updates apply everywhere — directory, reviews, notes, and achievements.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" {...form.register("employeeId")} />

          <div className="grid flex-1 gap-4 overflow-y-auto py-4 pr-1">
            {form.formState.errors.root?.message && (
              <p className="text-destructive text-sm" role="alert">
                {form.formState.errors.root.message}
              </p>
            )}
            {accessError && (
              <p className="text-destructive text-sm" role="alert">{accessError}</p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="ie-code">Employee ID</Label>
              <Input id="ie-code" placeholder="E.g. EMP-1024" {...form.register("employee_code")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ie-name">Name</Label>
              <Input id="ie-name" {...form.register("name")} />
              {form.formState.errors.name?.message && (
                <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ie-email">Email</Label>
              <Input id="ie-email" type="email" {...form.register("email")} />
              {form.formState.errors.email?.message && (
                <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ie-role">Position</Label>
                <Input id="ie-role" {...form.register("role")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ie-dept">Department</Label>
                <select
                  id="ie-dept"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  {...form.register("department")}
                >
                  <option value="">No department</option>
                  {employee.department?.trim() &&
                    !departments.some(
                      (d) => d.name.trim().toLowerCase() === employee.department?.trim().toLowerCase(),
                    ) && (
                      <option value={employee.department.trim()}>
                        {employee.department.trim()} (legacy)
                      </option>
                    )}
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ie-team">Team</Label>
                <select
                  id="ie-team"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  {...form.register("team_name")}
                >
                  <option value="">No team</option>
                  {employee.team_name?.trim() &&
                    !teams.some(
                      (t) => t.name.trim().toLowerCase() === employee.team_name?.trim().toLowerCase(),
                    ) && (
                      <option value={employee.team_name.trim()}>
                        {employee.team_name.trim()} (legacy)
                      </option>
                    )}
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ie-join">Join date</Label>
                <Input id="ie-join" type="date" {...form.register("join_date")} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ie-status">Status</Label>
              <select
                id="ie-status"
                className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                {...form.register("is_active")}
              >
                <option value="true">Active</option>
                <option value="false">Inactive (resigned)</option>
              </select>
            </div>

            {/* Workspace access */}
            <div className="rounded-xl border border-border/80 bg-muted/25 p-4 space-y-4">
              <div>
                <Label htmlFor="ie-access" className="text-foreground font-medium">
                  Workspace access
                </Label>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {accessInvitedAt
                    ? "An invite email was sent to this employee. Use resend only if they did not receive it."
                    : "Choose their role here, send an invite (creates login or links their existing account), then save access if they already signed up and you changed the role."}
                </p>
              </div>

              <select
                id="ie-access"
                className="border-input bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm"
                value={accessSelection}
                disabled={inviteLoading || saveAccessLoading}
                onChange={(e) => setAccessSelection(e.target.value as AccessSelection)}
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
                    inviteLoading ||
                    saveAccessLoading ||
                    accessSelection === "none"
                  }
                  onClick={() => {
                    if (accessSelection === "none") return;
                    setAccessError(null);
                    setInviteLoading(true);
                    void inviteEmployeeToWorkspace({
                      employeeId: employee.id,
                      role: accessSelection,
                    }).then((res) => {
                      setInviteLoading(false);
                      if (!res.ok) {
                        setAccessError(res.error);
                        return;
                      }
                      router.refresh();
                    });
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
                  disabled={inviteLoading || saveAccessLoading}
                  onClick={() => {
                    setAccessError(null);
                    setSaveAccessLoading(true);
                    void setEmployeeWorkspaceAccess({
                      employeeId: employee.id,
                      role: accessSelection,
                    }).then((res) => {
                      setSaveAccessLoading(false);
                      if (!res.ok) {
                        setAccessError(res.error);
                        return;
                      }
                      router.refresh();
                    });
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
                <strong className="text-foreground/90 font-medium">Send invite</strong> creates a
                Supabase login or links an existing account to this workspace.{" "}
                <strong className="text-foreground/90 font-medium">Update role</strong> only works
                after they have a linked account—use it to change Admin / HR / Manager / TL without
                sending mail.
              </p>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 mt-2 gap-2 border-t border-border/60 bg-background/80 pt-3 backdrop-blur">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <><Loader2Icon className="size-4 animate-spin" /> Saving…</>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
