"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmployeeRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { easingOut } from "@/lib/motion-variants";

export type EmployeeListRow = EmployeeRow & {
  achievement_count: number;
  review_count: number;
  notes_count: number;
};

const MotionTableRow = motion.create(TableRow);

function CountBadge({ value }: { value: number }): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.95rem] justify-center rounded-lg border px-2 py-0.5 text-xs font-semibold tabular-nums",
        value > 0
          ? "bg-primary/9 text-primary border-primary/14"
          : "border-border/60 bg-muted/45 text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

export function AnimatedEmployeesTable({
  employees,
}: {
  employees: EmployeeListRow[];
}): ReactElement {
  const prefersReducedMotion = useReducedMotion() === true;

  return (
    <motion.div
      className="-mx-[1px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easingOut }}
    >
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow className="border-border/80">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">Joined</TableHead>
            <TableHead className="text-center tabular-nums">
              Achievements
            </TableHead>
            <TableHead className="text-center tabular-nums">Reviews</TableHead>
            <TableHead className="text-center tabular-nums">Notes</TableHead>
            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee, index) => (
            <MotionTableRow
              key={employee.id}
              {...(prefersReducedMotion
                ? {}
                : {
                    initial: { opacity: 0, x: -8 },
                    animate: { opacity: 1, x: 0 },
                    transition: {
                      duration: 0.28,
                      ease: easingOut,
                      delay: 0.03 + index * 0.04,
                    },
                  })}
              className="group"
            >
              <TableCell className="py-3 font-medium">
                <Link
                  href={`/employees/${employee.id}/insights`}
                  className="text-foreground group-hover:text-primary underline-offset-4 transition-colors hover:underline"
                >
                  {employee.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate py-3">
                {employee.email}
              </TableCell>
              <TableCell className="py-3">
                {employee.role ? (
                  <span>{employee.role}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-3">
                {employee.department ? (
                  <span>{employee.department}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-3">
                {employee.team_name?.trim() ? (
                  <span>{employee.team_name}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground py-3 text-center text-xs whitespace-nowrap">
                {employee.join_date ?? "—"}
              </TableCell>
              <TableCell className="py-3 text-center">
                <CountBadge value={employee.achievement_count} />
              </TableCell>
              <TableCell className="py-3 text-center">
                <CountBadge value={employee.review_count} />
              </TableCell>
              <TableCell className="py-3 text-center">
                <CountBadge value={employee.notes_count} />
              </TableCell>
              <TableCell className="py-3 text-right">
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    render={<Link href={`/employees/${employee.id}`} />}
                    nativeButton={false}
                  >
                    Profile
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    render={
                      <Link href={`/employees/${employee.id}/generate-review`} />
                    }
                    nativeButton={false}
                  >
                    Roll-up
                  </Button>
                </div>
              </TableCell>
            </MotionTableRow>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
