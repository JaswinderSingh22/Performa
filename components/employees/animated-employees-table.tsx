"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  CheckIcon,
  ClipboardCopyIcon,
  Link2Icon,
  Loader2Icon,
  MailIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";

import { bulkDeleteEmployees, deleteEmployee } from "@/actions/employees";
import { sendReviewEmailAction } from "@/actions/send-review-email";
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
import type { EmployeeRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { easingOut } from "@/lib/motion-variants";

export type EmployeeListRow = EmployeeRow & {
  achievement_count: number;
  review_count: number;
  notes_count: number;
  is_team_lead?: boolean;
  access_role?: string | null;
  access_invited_at?: string | null;
  access_joined_at?: string | null;
  /** Form token from the currently open review cycle, if any */
  review_form_token?: string | null;
  /** Team manager name from teams.manager_employee_id */
  reports_to_name?: string | null;
};

const MotionRow = motion.create("div");

function workspaceRoleLabel(role: string): string {
  switch (role) {
    case "tl":
      return "TL";
    case "hr":
      return "HR";
    case "admin":
      return "Org";
    default:
      return "Mgr";
  }
}

function AccessCell({ employee }: { employee: EmployeeListRow }): ReactElement {
  const hasLead = employee.is_team_lead === true;
  const wsRole = employee.access_role ?? null;
  const pendingWorkspaceJoin = Boolean(
    wsRole &&
      employee.access_invited_at &&
      !employee.access_joined_at,
  );

  if (!hasLead && !wsRole) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="text-foreground flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] leading-snug">
      {hasLead ? (
        <span
          className="bg-emerald-500/[0.13] shrink-0 rounded px-1.5 py-0.5 font-semibold text-emerald-900 dark:text-emerald-300"
          title="Team record lists them as manager"
        >
          Lead
        </span>
      ) : null}
      {wsRole ? (
        <span className="border-border/55 bg-muted/35 shrink-0 rounded border px-1.5 py-0.5 font-semibold tracking-tight text-muted-foreground">
          {workspaceRoleLabel(wsRole)}
        </span>
      ) : null}
      {pendingWorkspaceJoin ? (
        <span
          className="border-amber-500/35 bg-amber-500/[0.08] shrink-0 rounded border px-1.5 py-0.5 font-medium text-amber-800 dark:text-amber-400"
          title="No successful sign-in recorded for this workspace invite yet"
        >
          Pending
        </span>
      ) : null}
    </div>
  );
}

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

// ─── Review invite dialog ────────────────────────────────────────────────────

function ReviewInviteDialog({
  employee,
  formToken,
  open,
  onClose,
}: {
  employee: EmployeeListRow;
  formToken: string;
  open: boolean;
  onClose: () => void;
}) {
  const formUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/review-form/${formToken}`
      : `/review-form/${formToken}`;

  const [copied, setCopied] = React.useState(false);
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [emailSentCount, setEmailSentCount] = React.useState(1);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  function copyLink() {
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function sendEmail() {
    setEmailSending(true);
    setEmailError(null);
    const result = await sendReviewEmailAction(employee.id);
    setEmailSending(false);
    if (result.success) {
      setEmailSentCount(result.cyclesSent ?? 1);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } else {
      setEmailError(result.error ?? "Failed to send email.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-xl">
            <SendIcon className="size-5" />
          </div>
          <DialogTitle>Send review form</DialogTitle>
          <DialogDescription>
            Share the self-review link with{" "}
            <strong className="text-foreground">{employee.name}</strong> — copy the link
            or send it directly to their email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Link box — input natively clips overflowing text */}
          <div className="bg-muted/50 rounded-xl border border-border/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Link2Icon className="text-muted-foreground size-4 shrink-0" />
              <input
                type="text"
                readOnly
                value={formUrl}
                className="text-muted-foreground bg-transparent font-mono text-xs flex-1 w-0 min-w-0 outline-none border-none cursor-default select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <CheckIcon className="size-4 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardCopyIcon className="size-4" />
                  Copy link
                </>
              )}
            </Button>

            <Button
              type="button"
              className="gap-2"
              onClick={sendEmail}
              disabled={emailSending || emailSent}
            >
              {emailSending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Sending…
                </>
              ) : emailSent ? (
                <>
                  <CheckIcon className="size-4" />
                  {emailSentCount > 1 ? `Sent ${emailSentCount} emails!` : "Email sent!"}
                </>
              ) : (
                <>
                  <MailIcon className="size-4" />
                  Send via email
                </>
              )}
            </Button>
          </div>

          {emailError && (
            <p className="text-destructive rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs">
              {emailError}
            </p>
          )}

          <div className="border-border/40 border-t pt-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              The link is unique to this employee and expires when the cycle closes.
              {employee.email ? (
                <> Email will be sent to <span className="text-foreground font-medium">{employee.email}</span>.</>
              ) : null}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single delete confirm dialog ────────────────────────────────────────────

function DeleteConfirmDialog({
  employee,
  open,
  onClose,
}: {
  employee: EmployeeListRow;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function confirm() {
    setDeleting(true);
    const res = await deleteEmployee({ employeeId: employee.id });
    setDeleting(false);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="bg-destructive/10 text-destructive mb-3 flex size-10 items-center justify-center rounded-xl">
            <Trash2Icon className="size-5" />
          </div>
          <DialogTitle>Delete employee?</DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{employee.name}</strong> and all
            associated reviews, notes, and achievements will be permanently removed.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/12"
            onClick={confirm}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row action buttons ──────────────────────────────────────────────────────

function RowActions({
  employee,
  canEditDelete,
  canInvite,
  isLocked,
  onEditClick,
  onDialogOpenChange,
}: {
  employee: EmployeeListRow;
  canEditDelete: boolean;
  canInvite: boolean;
  isLocked: boolean;
  onEditClick: () => void;
  onDialogOpenChange?: (open: boolean) => void;
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const hasFormToken = !!employee.review_form_token;
  const alreadySentInvite = !!employee.access_invited_at;

  function openDelete() { setDeleteOpen(true); onDialogOpenChange?.(true); }
  function closeDelete() { setDeleteOpen(false); onDialogOpenChange?.(false); }
  function openInvite() { setInviteOpen(true); onDialogOpenChange?.(true); }
  function closeInvite() { setInviteOpen(false); onDialogOpenChange?.(false); }

  return (
    <>
      <div
        className="flex items-center gap-1 px-2 py-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {canEditDelete && (
          <>
            <button
              type="button"
              onClick={onEditClick}
              disabled={isLocked}
              title="Edit employee"
              className={cn(
                "flex size-7 items-center justify-center rounded-lg border border-transparent transition-colors",
                "hover:border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                isLocked && "cursor-not-allowed opacity-40",
              )}
            >
              <PencilIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={openDelete}
              disabled={isLocked}
              title="Delete employee"
              className={cn(
                "flex size-7 items-center justify-center rounded-lg border border-transparent transition-colors",
                "hover:border-destructive/30 hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
                isLocked && "cursor-not-allowed opacity-40",
              )}
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </>
        )}

        {canInvite && (
          <button
            type="button"
            onClick={openInvite}
            disabled={!hasFormToken}
            title={
              hasFormToken
                ? alreadySentInvite
                  ? "Resend review form link"
                  : "Send review form link"
                : "No active review cycle"
            }
            className={cn(
              "flex size-7 items-center justify-center rounded-lg border border-transparent transition-colors",
              hasFormToken
                ? "hover:border-orange-500/30 hover:bg-orange-500/10 text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400"
                : "cursor-not-allowed opacity-30 text-muted-foreground",
            )}
          >
            {alreadySentInvite && hasFormToken ? (
              <MailIcon className="size-3.5" />
            ) : (
              <SendIcon className="size-3.5" />
            )}
          </button>
        )}
      </div>

      {deleteOpen && (
        <DeleteConfirmDialog
          employee={employee}
          open={deleteOpen}
          onClose={closeDelete}
        />
      )}
      {inviteOpen && employee.review_form_token && (
        <ReviewInviteDialog
          employee={employee}
          formToken={employee.review_form_token}
          open={inviteOpen}
          onClose={closeInvite}
        />
      )}
    </>
  );
}

// ─── Per-row wrapper (handles dialog-open state to block row navigation) ──────

function EmployeeRow({
  employee,
  index,
  isLocked,
  isSelected,
  gridCols,
  prefersReducedMotion,
  canEditDelete,
  canInvite,
  toggleOne,
  onEditEmployee,
}: {
  employee: EmployeeListRow;
  index: number;
  isLocked: boolean;
  isSelected: boolean;
  gridCols: string;
  prefersReducedMotion: boolean;
  canEditDelete: boolean;
  canInvite: boolean;
  toggleOne: (id: string) => void;
  onEditEmployee?: (employee: EmployeeListRow) => void;
}) {
  const router = useRouter();
  const dialogOpenRef = React.useRef(false);

  return (
    <MotionRow
      {...(prefersReducedMotion
        ? {}
        : {
            initial: { opacity: 0, x: -8 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.28, ease: easingOut, delay: 0.03 + index * 0.04 },
          })}
      className={cn(
        "grid items-center border-b border-border/60 cursor-pointer",
        isLocked ? "opacity-80" : null,
        isSelected ? "bg-primary/5" : "hover:bg-muted/30",
      )}
      style={{ gridTemplateColumns: gridCols }}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (dialogOpenRef.current) return;
        router.push(`/employees/${employee.id}/insights`);
      }}
      onMouseEnter={() => router.prefetch(`/employees/${employee.id}/insights`)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !dialogOpenRef.current) {
          e.preventDefault();
          router.push(`/employees/${employee.id}/insights`);
        }
      }}
    >
      {/* Checkbox cell */}
      <div
        className="flex items-center justify-center px-2 py-3 border-r border-border/60"
        onClick={(e) => { e.stopPropagation(); if (!isLocked && canEditDelete) toggleOne(employee.id); }}
        role="presentation"
      >
        {canEditDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!isLocked) toggleOne(employee.id); }}
            disabled={isLocked}
            className={cn(
              "flex size-4 items-center justify-center rounded border transition-colors",
              isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border/80 bg-background hover:border-primary/60",
              isLocked && "cursor-not-allowed opacity-40",
            )}
            title={isSelected ? "Deselect" : "Select"}
          >
            {isSelected && <CheckIcon className="size-2.5" />}
          </button>
        )}
      </div>

      {/* S.No */}
      <div className="px-3 py-3 text-left text-xs tabular-nums border-r border-border/60">{index + 1}</div>

      {/* Employee ID */}
      <div className="px-3 py-3 text-left text-xs tabular-nums text-muted-foreground border-r border-border/60 whitespace-nowrap">
        {employee.employee_code?.trim() ? employee.employee_code : "—"}
      </div>

      {/* Name */}
      <div className="px-3 py-3 text-left font-medium border-r border-border/60">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate">{employee.name}</span>
          {isLocked && <span className="border-border/60 bg-muted/50 text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold">Locked</span>}
          {employee.is_active === false && <span className="border-border/60 bg-muted/50 text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold">Inactive</span>}
        </div>
      </div>

      {/* Reports to */}
      <div
        className="border-border/60 px-3 py-3 text-left border-r"
        title={employee.reports_to_name?.trim() || undefined}
      >
        {employee.reports_to_name?.trim() ? (
          <span className="text-foreground line-clamp-2 text-xs font-medium leading-snug">{employee.reports_to_name}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>

      {/* Access — narrow column; chips wrap tightly */}
      <div className="border-border/60 flex min-h-10 min-w-0 max-w-[10.25rem] items-start border-r px-2 py-2">
        <AccessCell employee={employee} />
      </div>

      {/* Email */}
      <div className="px-3 py-3 text-left text-muted-foreground truncate border-r border-border/60">{employee.email}</div>

      {/* Position */}
      <div className="px-3 py-3 text-left border-r border-border/60">{employee.role ?? <span className="text-muted-foreground">—</span>}</div>

      {/* Department */}
      <div className="px-3 py-3 text-left border-r border-border/60">{employee.department ?? <span className="text-muted-foreground">—</span>}</div>

      {/* Team */}
      <div className="px-3 py-3 text-left border-r border-border/60">{employee.team_name?.trim() ? employee.team_name : <span className="text-muted-foreground">—</span>}</div>

      {/* Joined */}
      <div className="px-3 py-3 text-left text-xs whitespace-nowrap text-muted-foreground border-r border-border/60">{employee.join_date ?? "—"}</div>

      {/* Achievements */}
      <div className="px-3 py-3 text-left border-r border-border/60"><CountBadge value={employee.achievement_count} /></div>

      {/* Reviews */}
      <div className="px-3 py-3 text-left border-r border-border/60"><CountBadge value={employee.review_count} /></div>

      {/* Notes */}
      <div className="px-3 py-3 text-left border-r border-border/60"><CountBadge value={employee.notes_count} /></div>

      {/* Actions */}
      <RowActions
        employee={employee}
        canEditDelete={canEditDelete}
        canInvite={canInvite}
        isLocked={isLocked}
        onEditClick={() => onEditEmployee?.(employee)}
        onDialogOpenChange={(open) => {
          if (open) {
            dialogOpenRef.current = true;
          } else {
            // Delay so the backdrop click event that triggered the close
            // doesn't immediately propagate to the row's onClick
            setTimeout(() => { dialogOpenRef.current = false; }, 80);
          }
        }}
      />
    </MotionRow>
  );
}

// ─── Main table ──────────────────────────────────────────────────────────────

export function AnimatedEmployeesTable({
  employees,
  lockedEmployeeIds,
  currentUserRole,
  onEditEmployee,
}: {
  employees: EmployeeListRow[];
  lockedEmployeeIds?: string[];
  currentUserRole?: string | null;
  onEditEmployee?: (employee: EmployeeListRow) => void;
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

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false);

  const canEditDelete =
    currentUserRole === "admin" || currentUserRole === "hr";
  const canInvite =
    currentUserRole === "admin" ||
    currentUserRole === "hr" ||
    currentUserRole === "manager" ||
    currentUserRole === "tl";

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
        employee.employee_code ?? "",
        employee.role,
        employee.department,
        employee.team_name ?? "",
        employee.reports_to_name ?? "",
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

  // Clear selection when visible employees change
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [visibleEmployees]);

  React.useEffect(() => {
    for (const employee of visibleEmployees.slice(0, 24)) {
      router.prefetch(`/employees/${employee.id}/insights`);
    }
  }, [router, visibleEmployees]);

  const allVisibleSelectable = visibleEmployees.filter((e) => !lockedSet.has(e.id));
  const allSelected =
    allVisibleSelectable.length > 0 &&
    allVisibleSelectable.every((e) => selectedIds.has(e.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleSelectable.map((e) => e.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const res = await bulkDeleteEmployees({ employeeIds: [...selectedIds] });
    setBulkDeleting(false);
    setBulkDeleteConfirm(false);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    setSelectedIds(new Set());
    router.refresh();
  }

  // Grid columns: checkbox | S.No | EmpID | Name | Reports to | Access | Email | Position | Dept | Team | Joined | Ach | Rev | Notes | Actions
  const gridCols =
    "36px 40px 100px minmax(120px, 1fr) 108px 124px minmax(128px, 200px) minmax(112px, 180px) minmax(92px, 140px) minmax(80px, 120px) 88px 72px 72px 72px 92px";

  return (
    <motion.div
      className="-mx-[1px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easingOut }}
    >
      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-end gap-3 px-1">
        <div className="grid gap-1">
          <label htmlFor="employee-table-search" className="text-muted-foreground text-xs font-medium">
            Search
          </label>
          <Input
            id="employee-table-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, manager, role, team..."
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
              <option key={dept} value={dept}>{dept}</option>
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
              <option key={team} value={team}>{team}</option>
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

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && canEditDelete && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            {bulkDeleteConfirm ? (
              <div className="flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-2.5">
                <p className="text-destructive text-sm font-medium">
                  Delete {selectedIds.size} employee{selectedIds.size > 1 ? "s" : ""}? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBulkDeleteConfirm(false)}
                    disabled={bulkDeleting}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/12 gap-1.5 text-xs"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                  >
                    {bulkDeleting ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-3.5" />
                    )}
                    Confirm delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 flex items-center justify-between rounded-xl border border-primary/20 px-4 py-2.5">
                <p className="text-sm font-medium">
                  {selectedIds.size} employee{selectedIds.size > 1 ? "s" : ""} selected
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/12 gap-1.5 text-xs"
                    onClick={() => setBulkDeleteConfirm(true)}
                  >
                    <Trash2Icon className="size-3.5" />
                    Delete selected
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-card border-border/70 overflow-hidden rounded-xl border shadow-sm">
        <div className="relative max-h-[520px] overflow-auto">
          <div className="inline-block min-w-max">
            {/* Header */}
            <div
              className="sticky top-0 z-30 grid bg-muted text-xs font-semibold text-foreground border-b border-border/60"
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* Checkbox header */}
              <div
                className="flex items-center justify-center px-2 py-2 border-r border-border/60"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                {canEditDelete && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={cn(
                      "flex size-4 items-center justify-center rounded border transition-colors",
                      allSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/80 bg-background hover:border-primary/60",
                    )}
                    title={allSelected ? "Deselect all" : "Select all"}
                  >
                    {allSelected && <CheckIcon className="size-2.5" />}
                    {!allSelected && someSelected && (
                      <span className="bg-primary/60 block size-1.5 rounded-sm" />
                    )}
                  </button>
                )}
              </div>
              {[
                "S.No",
                "Employee ID",
                "Name",
                "Reports to",
                "Access",
                "Email",
                "Position",
                "Department",
                "Team",
                "Joined",
                "Achievements",
                "Reviews",
                "Notes",
                "Actions",
              ].map((h, idx) => (
                <div
                  key={h}
                  className={cn(
                    "px-3 py-2 text-left border-r border-border/60",
                    idx === 13 && "border-r-0",
                  )}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="text-sm">
              {visibleEmployees.length === 0 ? (
                <div className="text-muted-foreground px-4 py-10 text-center">
                  No employees match current search or filters.
                </div>
              ) : (
                visibleEmployees.map((employee, index) => {
                  const isLocked = lockedSet.has(employee.id);
                  const isSelected = selectedIds.has(employee.id);

                  return (
                    <EmployeeRow
                      key={employee.id}
                      employee={employee}
                      index={index}
                      isLocked={isLocked}
                      isSelected={isSelected}
                      gridCols={gridCols}
                      prefersReducedMotion={prefersReducedMotion}
                      canEditDelete={canEditDelete}
                      canInvite={canInvite}
                      toggleOne={toggleOne}
                      onEditEmployee={onEditEmployee}
                    />
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
