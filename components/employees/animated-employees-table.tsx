"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

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
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion() === true;
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [teamFilter, setTeamFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<
    "name_asc" | "name_desc" | "join_date_desc" | "join_date_asc"
  >("name_asc");

  const departmentOptions = React.useMemo(() => {
    return [...new Set(employees.map((e) => e.department.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [employees]);

  const teamOptions = React.useMemo(() => {
    return [
      ...new Set(employees.map((e) => e.team_name?.trim() ?? "").filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [employees]);

  const visibleEmployees = React.useMemo(() => {
    const filtered = employees.filter((employee) => {
      const dept = employee.department.trim();
      const team = employee.team_name?.trim() ?? "";
      const deptOk = departmentFilter === "all" || dept === departmentFilter;
      const teamOk = teamFilter === "all" || team === teamFilter;
      return deptOk && teamOk;
    });

    const byJoin = (row: EmployeeListRow): number => {
      if (!row.join_date) return Number.NaN;
      const t = Date.parse(row.join_date);
      return Number.isNaN(t) ? Number.NaN : t;
    };

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
      }
      const at = byJoin(a);
      const bt = byJoin(b);
      const aMissing = Number.isNaN(at);
      const bMissing = Number.isNaN(bt);
      if (aMissing && bMissing) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      if (aMissing) return 1;
      if (bMissing) return -1;
      return sortBy === "join_date_desc" ? bt - at : at - bt;
    });

    return sorted;
  }, [employees, departmentFilter, teamFilter, sortBy]);

  return (
    <motion.div
      className="-mx-[1px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easingOut }}
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 px-1">
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs font-medium">Department</label>
          <select
            className="border-input bg-background text-foreground h-8 min-w-[170px] rounded-lg border px-2 text-sm"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs font-medium">Team</label>
          <select
            className="border-input bg-background text-foreground h-8 min-w-[170px] rounded-lg border px-2 text-sm"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="all">All teams</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs font-medium">Sort</label>
          <select
            className="border-input bg-background text-foreground h-8 min-w-[190px] rounded-lg border px-2 text-sm"
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as
                  | "name_asc"
                  | "name_desc"
                  | "join_date_desc"
                  | "join_date_asc",
              )
            }
          >
            <option value="name_asc">Name (A to Z)</option>
            <option value="name_desc">Name (Z to A)</option>
            <option value="join_date_desc">Joining date (Newest first)</option>
            <option value="join_date_asc">Joining date (Oldest first)</option>
          </select>
        </div>
      </div>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleEmployees.map((employee, index) => (
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
              className="group cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/employees/${employee.id}/insights`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/employees/${employee.id}/insights`);
                }
              }}
            >
              <TableCell className="py-3 font-medium">
                <span className="text-foreground group-hover:text-primary underline-offset-4 transition-colors">
                  {employee.name}
                </span>
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
            </MotionTableRow>
          ))}
          {visibleEmployees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-muted-foreground py-10 text-center text-sm">
                No employees match current filters.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </motion.div>
  );
}
