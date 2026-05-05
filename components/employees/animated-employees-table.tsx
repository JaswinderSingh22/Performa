"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { Input } from "@/components/ui/input";
import type { EmployeeRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { easingOut } from "@/lib/motion-variants";

export type EmployeeListRow = EmployeeRow & {
  achievement_count: number;
  review_count: number;
  notes_count: number;
};

const MotionRow = motion.create("div");

function CountBadge({ value }: { value: number }): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.8rem] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
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
  lockedEmployeeIds,
}: {
  employees: EmployeeListRow[];
  lockedEmployeeIds?: string[];
}): ReactElement {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion() === true;
  const lockedSet = React.useMemo(
    () => new Set((lockedEmployeeIds ?? []).filter(Boolean)),
    [lockedEmployeeIds],
  );
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [teamFilter, setTeamFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
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
    const query = searchQuery.trim().toLowerCase();
    const filtered = employees.filter((employee) => {
      const dept = employee.department.trim();
      const team = employee.team_name?.trim() ?? "";
      const deptOk = departmentFilter === "all" || dept === departmentFilter;
      const teamOk = teamFilter === "all" || team === teamFilter;
      const searchable = [
        employee.name,
        employee.email,
        employee.role,
        employee.department,
        employee.team_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const searchOk = query.length === 0 || searchable.includes(query);
      return deptOk && teamOk && searchOk;
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
  }, [employees, departmentFilter, teamFilter, sortBy, searchQuery]);

  React.useEffect(() => {
    // Warm Next.js route cache for likely clicks.
    for (const employee of visibleEmployees.slice(0, 24)) {
      router.prefetch(`/employees/${employee.id}/insights`);
    }
  }, [router, visibleEmployees]);

  return (
    <motion.div
      className="-mx-[1px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easingOut }}
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 px-1">
        <div className="grid gap-1">
          <label htmlFor="employee-table-search" className="text-muted-foreground text-xs font-medium">
            Search
          </label>
          <Input
            id="employee-table-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, role, team..."
            className="h-8 min-w-[220px] md:min-w-[280px]"
          />
        </div>
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
      <div className="bg-card border-border/70 overflow-hidden rounded-xl border shadow-sm">
        <div className="relative max-h-[520px] overflow-auto">
          <div className="inline-block min-w-max">
            <div
              className={cn(
                "sticky top-0 z-30 grid bg-muted text-xs font-semibold text-foreground",
                "border-b border-border/60",
              )}
              style={{
                gridTemplateColumns:
                  "70px 180px 240px 160px 150px 150px 120px 120px 100px 100px",
              }}
            >
              {[
                "S.No",
                "Name",
                "Email",
                "Role",
                "Department",
                "Team",
                "Joined",
                "Achievements",
                "Reviews",
                "Notes",
              ].map((h, idx) => (
                <div
                  key={h}
                  className={cn(
                    "px-3 py-2 text-left",
                    "border-border/60 border-r",
                    idx === 9 ? "border-r-0" : null,
                  )}
                >
                  {h}
                </div>
              ))}
            </div>

            <div className="text-sm">
              {visibleEmployees.length === 0 ? (
                <div className="text-muted-foreground px-4 py-10 text-center">
                  No employees match current search or filters.
                </div>
              ) : (
                visibleEmployees.map((employee, index) => {
                  const isLocked = lockedSet.has(employee.id);
                  return (
                    <MotionRow
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
                      className={cn(
                        "grid items-center border-b border-border/60",
                        "hover:bg-muted/30 cursor-pointer",
                        isLocked ? "opacity-80" : null,
                      )}
                      style={{
                        gridTemplateColumns:
                          "70px 180px 240px 160px 150px 150px 120px 120px 100px 100px",
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/employees/${employee.id}/insights`)}
                      onMouseEnter={() =>
                        router.prefetch(`/employees/${employee.id}/insights`)
                      }
                      onFocus={() => router.prefetch(`/employees/${employee.id}/insights`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/employees/${employee.id}/insights`);
                        }
                      }}
                    >
                      <div className="px-3 py-3 text-left text-xs tabular-nums border-r border-border/60">
                        {index + 1}
                      </div>
                      <div className="px-3 py-3 text-left font-medium border-r border-border/60">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate group-hover:text-primary transition-colors">
                            {employee.name}
                          </span>
                          {isLocked ? (
                            <span className="border-border/60 bg-muted/50 text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                              Locked
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="px-3 py-3 text-left text-muted-foreground truncate border-r border-border/60">
                        {employee.email}
                      </div>
                      <div className="px-3 py-3 text-left border-r border-border/60">
                        {employee.role ? employee.role : <span className="text-muted-foreground">—</span>}
                      </div>
                      <div className="px-3 py-3 text-left border-r border-border/60">
                        {employee.department ? employee.department : <span className="text-muted-foreground">—</span>}
                      </div>
                      <div className="px-3 py-3 text-left border-r border-border/60">
                        {employee.team_name?.trim()
                          ? employee.team_name
                          : <span className="text-muted-foreground">—</span>}
                      </div>
                      <div className="px-3 py-3 text-left text-xs whitespace-nowrap text-muted-foreground border-r border-border/60">
                        {employee.join_date ?? "—"}
                      </div>
                      <div className="px-3 py-3 text-left border-r border-border/60">
                        <CountBadge value={employee.achievement_count} />
                      </div>
                      <div className="px-3 py-3 text-left border-r border-border/60">
                        <CountBadge value={employee.review_count} />
                      </div>
                      <div className="px-3 py-3 text-left">
                        <CountBadge value={employee.notes_count} />
                      </div>
                    </MotionRow>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
