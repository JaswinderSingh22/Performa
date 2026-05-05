"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, PlusIcon } from "lucide-react";

import { createEmployee } from "@/actions/employees";
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
}: {
  teams: TeamOption[];
  departments: TeamOption[];
}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const form = useForm<EmployeeCreateFormValues>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
      department: "",
      team_name: "",
      join_date: undefined,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await createEmployee(values);
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    setOpen(false);
    form.reset();
    router.refresh();
  });

  return (
    <>
      <Button type="button" className="gap-1" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Add employee
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>New employee</DialogTitle>
              <DialogDescription>
                Add someone to track achievements and reviews.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {form.formState.errors.root?.message ? (
                <p className="text-destructive text-sm" role="alert">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
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
                  <Label htmlFor="emp-role">Role</Label>
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
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
