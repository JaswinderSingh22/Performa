"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import {
  assignTeamDepartment,
  createDepartment,
  createTeam,
  deleteDepartment,
  deleteTeam,
  renameDepartment,
  renameTeam,
  updateDepartmentReviewCycle,
} from "@/actions/teams";
import { OrgHierarchyPanel } from "@/components/teams/org-hierarchy-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  REVIEW_CADENCE_LABELS,
  type ReviewCadence,
} from "@/lib/review-cadence";

type TeamListRow = {
  id: string;
  name: string;
  department_id: string;
  created_at: string;
};

type DepartmentListRow = {
  id: string;
  name: string;
  review_cadence: ReviewCadence | null;
  quarter_start_month: number | null;
  created_at: string;
};

type EmployeeTeamRow = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  employee_code?: string | null;
  reporting_to_employee_id?: string | null;
  is_active?: boolean | null;
  team_name?: string | null;
  department?: string | null;
};

export function TeamsManager({
  teams,
  departments,
  employees,
  canManage,
}: {
  teams: TeamListRow[];
  departments: DepartmentListRow[];
  employees: EmployeeTeamRow[];
  canManage: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [newTeam, setNewTeam] = React.useState("");
  const [newTeamDepartmentId, setNewTeamDepartmentId] = React.useState("");
  const [newDepartment, setNewDepartment] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const create = async (): Promise<void> => {
    if (!canManage) return;
    setError(null);
    const name = newTeam.trim();
    if (!name) {
      setError("Enter a team name.");
      return;
    }
    if (!newTeamDepartmentId) {
      setError("Choose a department for this team.");
      return;
    }
    setBusy("create");
    const res = await createTeam({ name, departmentId: newTeamDepartmentId });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNewTeam("");
    setNewTeamDepartmentId("");
    router.refresh();
  };

  const createDept = async (): Promise<void> => {
    if (!canManage) return;
    setError(null);
    const name = newDepartment.trim();
    if (!name) {
      setError("Enter a department name.");
      return;
    }
    setBusy("create-department");
    const res = await createDepartment({ name });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNewDepartment("");
    router.refresh();
  };

  const rename = async (teamId: string, currentName: string): Promise<void> => {
    if (!canManage) return;
    const next = window.prompt("New team name", currentName)?.trim();
    if (!next || next === currentName) return;
    setError(null);
    setBusy(`rename:${teamId}`);
    const res = await renameTeam({ teamId, name: next });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const renameDept = async (
    departmentId: string,
    currentName: string,
  ): Promise<void> => {
    if (!canManage) return;
    const next = window.prompt("New department name", currentName)?.trim();
    if (!next || next === currentName) return;
    setError(null);
    setBusy(`rename-department:${departmentId}`);
    const res = await renameDepartment({ departmentId, name: next });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const remove = async (teamId: string, teamName: string): Promise<void> => {
    if (!canManage) return;
    const ok = window.confirm(
      `Delete "${teamName}"? Members will be unassigned from this team.`,
    );
    if (!ok) return;
    setError(null);
    setBusy(`delete:${teamId}`);
    const res = await deleteTeam({ teamId });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const removeDept = async (
    departmentId: string,
    departmentName: string,
  ): Promise<void> => {
    if (!canManage) return;
    const ok = window.confirm(
      `Delete "${departmentName}"? Members will be unassigned from this department.`,
    );
    if (!ok) return;
    setError(null);
    setBusy(`delete-department:${departmentId}`);
    const res = await deleteDepartment({ departmentId });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const saveDepartmentCycle = async (
    departmentId: string,
    reviewCadence: ReviewCadence,
    quarterStartMonth: number,
  ): Promise<void> => {
    if (!canManage) return;
    setError(null);
    setBusy(`save-cycle:${departmentId}`);
    const res = await updateDepartmentReviewCycle({
      departmentId,
      reviewCadence,
      quarterStartMonth,
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const moveTeamDepartment = async (
    teamId: string,
    departmentId: string,
  ): Promise<void> => {
    if (!canManage) return;
    if (!departmentId) return;
    setError(null);
    setBusy(`move-team:${teamId}`);
    const res = await assignTeamDepartment({ teamId, departmentId });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const memberCountByTeam = React.useMemo(() => {
    const map = new Map<string, number>();
    const teamByName = new Map<string, string>(
      teams.map((t) => [t.name.trim().toLowerCase(), t.id]),
    );
    for (const employee of employees) {
      const key = employee.team_name?.trim().toLowerCase() ?? "";
      if (!key) continue;
      const teamId = teamByName.get(key);
      if (!teamId) continue;
      map.set(teamId, (map.get(teamId) ?? 0) + 1);
    }
    return map;
  }, [employees, teams]);

  const memberCountByDepartment = React.useMemo(() => {
    const map = new Map<string, number>();
    const deptByName = new Map<string, string>(
      departments.map((d) => [d.name.trim().toLowerCase(), d.id]),
    );
    for (const employee of employees) {
      const key = employee.department?.trim().toLowerCase() ?? "";
      if (!key) continue;
      const departmentId = deptByName.get(key);
      if (!departmentId) continue;
      map.set(departmentId, (map.get(departmentId) ?? 0) + 1);
    }
    return map;
  }, [departments, employees]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <OrgHierarchyPanel employees={employees} defaultMode="canvas" />

      <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
        <Card className="border-border/65 flex flex-col shadow-md xl:h-[620px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="text-primary size-4" />
              Teams
            </CardTitle>
            <CardDescription>
              {teams.length === 0
                ? "No teams created yet."
                : `${teams.length} team${teams.length === 1 ? "" : "s"} in your workspace.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="grid flex-1 gap-1.5">
                <Label htmlFor="new-team-name">Team name</Label>
                <Input
                  id="new-team-name"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder="e.g. Product Engineering"
                  disabled={!canManage || busy === "create"}
                />
              </div>
              <div className="grid gap-1.5 md:min-w-[220px]">
                <Label htmlFor="new-team-department">Department</Label>
                <select
                  id="new-team-department"
                  className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2.5 text-sm"
                  value={newTeamDepartmentId}
                  onChange={(e) => setNewTeamDepartmentId(e.target.value)}
                  disabled={!canManage || busy === "create"}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                className="gap-1 md:self-end"
                onClick={() => void create()}
                disabled={!canManage || busy === "create"}
              >
                {busy === "create" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Add
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 xl:pr-1">
              {teams.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Create your first team to organize employee ownership.
                </p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-muted/25 border-border/60 flex flex-col gap-3 rounded-xl border px-3 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{team.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {(() => {
                          const dept = departments.find((d) => d.id === team.department_id);
                          return dept ? `${dept.name} · ` : "";
                        })()}
                        {memberCountByTeam.get(team.id) ?? 0} member
                        {(memberCountByTeam.get(team.id) ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-muted-foreground text-xs">Department</Label>
                        <select
                          aria-label={`Department for ${team.name}`}
                          defaultValue={team.department_id}
                          className="border-input bg-background text-foreground h-8 min-w-[180px] rounded-lg border px-2 text-sm"
                          disabled={!canManage || busy === `move-team:${team.id}`}
                          onChange={(e) => void moveTeamDepartment(team.id, e.target.value)}
                        >
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                        {busy === `move-team:${team.id}` ? (
                          <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        disabled={!canManage || busy === `rename:${team.id}`}
                        onClick={() => void rename(team.id, team.name)}
                        aria-label={`Rename ${team.name}`}
                        title="Rename team"
                      >
                        {busy === `rename:${team.id}` ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <PencilIcon className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        disabled={!canManage || busy === `delete:${team.id}`}
                        onClick={() => void remove(team.id, team.name)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${team.name}`}
                        title="Delete team"
                      >
                        {busy === `delete:${team.id}` ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/65 flex flex-col shadow-md xl:h-[620px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2Icon className="text-primary size-4" />
              Departments
            </CardTitle>
            <CardDescription>
              {departments.length === 0
                ? "No departments created yet."
                : `${departments.length} department${departments.length === 1 ? "" : "s"} in your workspace.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-1.5">
                <Label htmlFor="new-department-name">Department name</Label>
                <Input
                  id="new-department-name"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="e.g. Engineering"
                  disabled={!canManage || busy === "create-department"}
                />
              </div>
              <Button
                type="button"
                className="gap-1 sm:self-end"
                onClick={() => void createDept()}
                disabled={!canManage || busy === "create-department"}
              >
                {busy === "create-department" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Add
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 xl:pr-1">
              {departments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Create your first department to group employees by function.
                </p>
              ) : (
                departments.map((department) => (
                  <div
                    key={department.id}
                    className="bg-muted/25 border-border/60 space-y-3 rounded-xl border px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{department.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {memberCountByDepartment.get(department.id) ?? 0} member
                          {(memberCountByDepartment.get(department.id) ?? 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          disabled={!canManage || busy === `rename-department:${department.id}`}
                          onClick={() => void renameDept(department.id, department.name)}
                          aria-label={`Rename ${department.name}`}
                          title="Rename department"
                        >
                          {busy === `rename-department:${department.id}` ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <PencilIcon className="size-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          disabled={!canManage || busy === `delete-department:${department.id}`}
                          onClick={() => void removeDept(department.id, department.name)}
                          className="text-destructive hover:text-destructive"
                          aria-label={`Delete ${department.name}`}
                          title="Delete department"
                        >
                          {busy === `delete-department:${department.id}` ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <DepartmentCycleEditor
                      department={department}
                      disabled={!canManage}
                      busy={busy === `save-cycle:${department.id}`}
                      onSave={(cadence, month) =>
                        void saveDepartmentCycle(department.id, cadence, month)
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DepartmentCycleEditor({
  department,
  disabled,
  busy,
  onSave,
}: {
  department: DepartmentListRow;
  disabled: boolean;
  busy: boolean;
  onSave: (cadence: ReviewCadence, month: number) => void;
}): React.ReactElement {
  const [cadence, setCadence] = React.useState<ReviewCadence>(
    (department.review_cadence as ReviewCadence | null) ?? "quarterly",
  );
  const [month, setMonth] = React.useState<number>(
    typeof department.quarter_start_month === "number"
      ? department.quarter_start_month
      : 1,
  );

  React.useEffect(() => {
    setCadence((department.review_cadence as ReviewCadence | null) ?? "quarterly");
    setMonth(
      typeof department.quarter_start_month === "number"
        ? department.quarter_start_month
        : 1,
    );
  }, [department.id, department.review_cadence, department.quarter_start_month]);

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="grid gap-1">
        <Label className="text-xs">Review cadence</Label>
        <select
          className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2 text-sm"
          value={cadence}
          disabled={disabled || busy}
          onChange={(e) => setCadence(e.target.value as ReviewCadence)}
        >
          {(Object.keys(REVIEW_CADENCE_LABELS) as ReviewCadence[]).map((c) => (
            <option key={c} value={c}>
              {REVIEW_CADENCE_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">
          {cadence === "quarterly" ? "Quarter start month" : "Start month"}
        </Label>
        <select
          className="border-input bg-background text-foreground h-8 w-full rounded-lg border px-2 text-sm"
          value={month}
          disabled={disabled || busy}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2026, m - 1, 1).toLocaleString(undefined, { month: "long" })}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={disabled || busy}
        onClick={() => onSave(cadence, month)}
      >
        {busy ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );
}
