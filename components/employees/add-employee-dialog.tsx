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

export function AddEmployeeDialog(): React.ReactElement {
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
                  <Input id="emp-dept" {...form.register("department")} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-team">Team</Label>
                <Input
                  id="emp-team"
                  placeholder="Squad or team name"
                  {...form.register("team_name")}
                />
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
