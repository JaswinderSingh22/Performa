"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, PlusIcon } from "lucide-react";

import { createEmployee } from "@/actions/employees";
import { inviteEmployeeToWorkspace } from "@/actions/employee-access";
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
import {
  employeeCreateSchema,
  type EmployeeCreateFormValues,
} from "@/validators/employee";

type TeamOption = { id: string; name: string };

export function AddEmployeeDialog({
  teams,
  departments,
  disabled = false,
  disabledReason,
}: {
  teams: TeamOption[];
  departments: TeamOption[];
  disabled?: boolean;
  disabledReason?: string | null;
}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [accessRole, setAccessRole] = React.useState<
    "none" | "admin" | "hr" | "manager" | "tl"
  >("none");
  const submitRef = React.useRef(false);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<EmployeeCreateFormValues>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      employee_code: "",
      role: "",
      department: "",
      team_name: "",
      join_date: undefined,
      is_active: true,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitRef.current) return;
    submitRef.current = true;
    setSubmitting(true);
    try {
    const result = await createEmployee(values);
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    if (accessRole !== "none" && result.data?.id) {
      const inviteRes = await inviteEmployeeToWorkspace({
        employeeId: result.data.id,
        role: accessRole,
      });
      if (!inviteRes.ok) {
        form.setError("root", { message: inviteRes.error });
        return;
      }
    }
    setOpen(false);
    form.reset();
    setAccessRole("none");
    router.refresh();
    } finally {
      submitRef.current = false;
      setSubmitting(false);
    }
  });

  return (
    <>
      <Button
        type="button"
        className="gap-1"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason ?? "Employee limit reached." : undefined}
      >
        <PlusIcon className="size-4" />
        Add employee
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden">
          <form onSubmit={onSubmit} className="flex max-h-[calc(85vh-2rem)] flex-col">
            <DialogHeader>
              <DialogTitle>New employee</DialogTitle>
              <DialogDescription>
                Add someone to track achievements and reviews.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-4 overflow-y-auto py-4 pr-1">
              {form.formState.errors.root?.message ? (
                <p className="text-destructive text-sm" role="alert">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="emp-code">Employee ID</Label>
                <Input
                  id="emp-code"
                  placeholder="E.g. EMP-1024"
                  {...form.register("employee_code")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-name">Name</Label>
                <Input id="emp-name" {...form.register("name")} />
                {form.formState.errors.name?.message ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-email">Email</Label>
                <Input
                  id="emp-email"
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
                  <Label htmlFor="emp-role">Position</Label>
                  <Input id="emp-role" {...form.register("role")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-dept">Department</Label>
                  <select
                    id="emp-dept"
                    className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                    {...form.register("department")}
                  >
                    <option value="">No department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-access">Workspace access (optional)</Label>
                <select
                  id="emp-access"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  value={accessRole}
                  onChange={(e) =>
                    setAccessRole(
                      e.target.value as "none" | "admin" | "hr" | "manager" | "tl",
                    )
                  }
                >
                  <option value="none">No login access</option>
                  <option value="tl">TL</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-muted-foreground text-xs">
                  If selected, we’ll send an invite email to this employee.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-status">Status</Label>
                <select
                  id="emp-status"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  {...form.register("is_active")}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive (resigned)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-team">Team</Label>
                <select
                  id="emp-team"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  {...form.register("team_name")}
                >
                  <option value="">No team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-join">Join date</Label>
                <Input
                  id="emp-join"
                  type="date"
                  {...form.register("join_date")}
                />
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 mt-2 border-t border-border/60 bg-background/80 pt-3 backdrop-blur">
              <Button type="submit" disabled={form.formState.isSubmitting || submitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save employee"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
