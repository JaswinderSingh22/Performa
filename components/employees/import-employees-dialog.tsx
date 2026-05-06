"use client";

import * as React from "react";
import type { ReactElement } from "react";
import Papa from "papaparse";
import { RotateCcwIcon, UploadIcon } from "lucide-react";

import { importEmployeesFromCsv } from "@/actions/import-employees";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ParsedRow = {
  rowNumber: number;
  name: string;
  email: string;
  employee_code?: string;
  is_active?: string;
  role?: string;
  department?: string;
  team_name?: string;
  join_date?: string;
  reporting_to_employee_code?: string;
};

type ToastState =
  | { kind: "success" | "warning" | "error"; message: string }
  | null;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

const HEADER_ALIASES: Record<keyof Omit<ParsedRow, "rowNumber">, string[]> = {
  name: ["name", "employee_name"],
  email: ["email", "email_id", "mail"],
  employee_code: ["employee_code", "employee_id", "emp_id", "employeeid", "empid"],
  is_active: ["is_active", "active", "status", "employee_status"],
  role: ["role", "title", "designation"],
  department: ["department", "dept", "function"],
  team_name: ["team_name", "team", "teamname"],
  join_date: ["join_date", "joining_date", "joindate", "joiningdate"],
  reporting_to_employee_code: [
    "reporting_to_employee_code",
    "reporting_to_employee_id",
    "reporting_to",
    "reports_to",
    "manager_employee_id",
    "manager_employee_code",
    "manager_emp_id",
    "manager_id",
    "manager",
  ],
};

function pickValue(
  row: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function parseCsvToRows(text: string): {
  rows: ParsedRow[];
  errors: { rowNumber: number; error: string }[];
} {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const errors: { rowNumber: number; error: string }[] = [];
  if (parsed.errors?.length) {
    for (const e of parsed.errors) {
      errors.push({
        rowNumber: typeof e.row === "number" ? e.row + 2 : 0,
        error: e.message,
      });
    }
  }

  const rows: ParsedRow[] = [];
  const data = parsed.data ?? [];
  for (let i = 0; i < data.length; i += 1) {
    const raw = data[i] ?? {};
    const rowNumber = i + 2; // + header row
    const name = pickValue(raw, HEADER_ALIASES.name) ?? "";
    const email = pickValue(raw, HEADER_ALIASES.email) ?? "";
    const employee_code = pickValue(raw, HEADER_ALIASES.employee_code) ?? "";
    const is_active = pickValue(raw, HEADER_ALIASES.is_active) ?? "";
    const role = pickValue(raw, HEADER_ALIASES.role) ?? "";
    const department = pickValue(raw, HEADER_ALIASES.department) ?? "";
    const team_name = pickValue(raw, HEADER_ALIASES.team_name) ?? "";
    const join_date = pickValue(raw, HEADER_ALIASES.join_date) ?? "";
    const reporting_to_employee_code =
      pickValue(raw, HEADER_ALIASES.reporting_to_employee_code) ?? "";

    rows.push({
      rowNumber,
      name,
      email,
      employee_code,
      is_active,
      role,
      department,
      team_name,
      join_date,
      reporting_to_employee_code,
    });
  }

  return { rows, errors };
}

function validateRow(row: ParsedRow): string | null {
  if (!row.name.trim()) return "Name is required.";
  const email = row.email.trim();
  if (!email) return "Email is required.";
  if (!row.employee_code?.trim()) return "Employee ID is required.";
  // simple client-side email check; server does authoritative validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email looks invalid.";
  if (row.join_date && row.join_date.trim().length > 0) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.join_date.trim())) {
      return "Join date must be YYYY-MM-DD.";
    }
  }
  return null;
}

export function ImportEmployeesDialog(): ReactElement {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ParsedRow[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = React.useState<ToastState>(null);
  const [rowErrors, setRowErrors] = React.useState<
    { rowNumber: number; error: string }[]
  >([]);
  const [result, setResult] = React.useState<{
    created: number;
    skippedDuplicates: number;
    skipped: { rowNumber: number; email: string; reason: string }[];
    errors: { rowNumber: number; email?: string; error: string }[];
  } | null>(null);

  const validated = React.useMemo(() => {
    const list = rows ?? [];
    const valid: ParsedRow[] = [];
    const invalid: { rowNumber: number; error: string }[] = [];
    for (const r of list) {
      const msg = validateRow(r);
      if (msg) invalid.push({ rowNumber: r.rowNumber, error: msg });
      else valid.push(r);
    }
    return { valid, invalid, total: list.length };
  }, [rows]);

  const resetAll = (): void => {
    setClientError(null);
    setFileName(null);
    setRows(null);
    setRowErrors([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    if (!open) resetAll();
  }, [open]);

  const onPickFile = async (file: File | null): Promise<void> => {
    resetAll();
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setClientError("Please upload a .csv file.");
      return;
    }
    const text = await file.text();
    const parsed = parseCsvToRows(text);
    setRows(parsed.rows);
    setRowErrors(parsed.errors);
  };

  const runImport = async (): Promise<void> => {
    setClientError(null);
    setBusy(true);
    setResult(null);
    try {
      const payload = {
        rows: validated.valid.map((r) => ({
          rowNumber: r.rowNumber,
          name: r.name,
          email: r.email,
          employee_code: r.employee_code ?? "",
          is_active: r.is_active ?? "",
          role: r.role ?? "",
          department: r.department ?? "",
          team_name: r.team_name ?? "",
          join_date: r.join_date?.trim() ? r.join_date.trim() : undefined,
          reporting_to_employee_code: r.reporting_to_employee_code ?? "",
        })),
      };
      const res = await importEmployeesFromCsv(payload);
      if (!res.ok) {
        setClientError(res.error);
        setToast({ kind: "error", message: res.error });
        return;
      }
      setResult({
        created: res.created,
        skippedDuplicates: res.skippedDuplicates,
        skipped: res.skipped,
        errors: res.errors,
      });

      if (res.skippedDuplicates > 0) {
        setToast({
          kind: "warning",
          message: `Imported ${res.created}. Skipped ${res.skippedDuplicates} duplicates.`,
        });
        return;
      }

      if (res.errors.length > 0) {
        setToast({
          kind: "warning",
          message: `Imported ${res.created}. ${res.errors.length} rows failed.`,
        });
        return;
      }

      setToast({
        kind: "success",
        message: `Imported ${res.created} employees successfully.`,
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const previewRows = (rows ?? []).slice(0, 8);
  const showPreview =
    previewRows.length > 0 && !(result && result.skippedDuplicates > 0);

  return (
    <>
      {toast ? (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-[100] max-w-[22rem] rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80",
            toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
              : toast.kind === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setOpen(true)}
      >
        <UploadIcon className="size-3.5" aria-hidden />
        Import CSV
      </Button>

      <DialogContent className="max-h-[85dvh] overflow-hidden p-0 sm:max-w-2xl">
        <div className="border-border/60 border-b px-4 py-4">
          <DialogHeader>
            <DialogTitle>Import employees</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns:{" "}
              <span className="font-medium">employee_id</span> (required),{" "}
              <span className="font-medium">name</span>,{" "}
              <span className="font-medium">email</span>,{" "}
              <span className="font-medium">role</span> (optional),{" "}
              <span className="font-medium">department</span> (optional),{" "}
              <span className="font-medium">team</span> (optional),{" "}
              <span className="font-medium">join_date</span> (optional, YYYY-MM-DD),{" "}
              <span className="font-medium">reporting_to</span> (optional manager Employee ID),{" "}
              <span className="font-medium">status</span> (optional: active/inactive).
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-3">
          {clientError ? (
            <p className="text-destructive text-sm" role="alert">
              {clientError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <label className="text-muted-foreground text-xs font-medium">
              CSV file
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) =>
                  void onPickFile(e.currentTarget.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  resetAll();
                  fileInputRef.current?.click();
                }}
              >
                <RotateCcwIcon className="size-3.5" aria-hidden />
                Re-upload
              </Button>
            </div>
            <button
              type="button"
              className="text-primary w-fit text-xs font-medium underline-offset-4 hover:underline"
              onClick={() => {
                void (async () => {
                  const res = await fetch("/samples/employees-import-sample.csv", {
                    cache: "no-store",
                  });
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  try {
                    const a = document.createElement("a");
                    a.href = url; // blob: (TopLoader auto-completes)
                    a.download = "employees-import-sample.csv";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } finally {
                    URL.revokeObjectURL(url);
                  }
                })();
              }}
            >
              Download sample CSV
            </button>
            {fileName ? (
              <p className="text-muted-foreground text-xs">{fileName}</p>
            ) : null}
          </div>

          {rows ? (
            <div className="rounded-xl border border-border/70 bg-muted/10 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground">
                  Rows:{" "}
                  <span className="text-foreground font-semibold tabular-nums">
                    {validated.total}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Valid:{" "}
                  <span className="text-foreground font-semibold tabular-nums">
                    {validated.valid.length}
                  </span>
                  {" · "}Invalid:{" "}
                  <span className="text-foreground font-semibold tabular-nums">
                    {validated.invalid.length + rowErrors.length}
                  </span>
                </p>
              </div>

              {(rowErrors.length > 0 || validated.invalid.length > 0) && (
                <div className="mt-2 space-y-1">
                  {[...rowErrors, ...validated.invalid].slice(0, 6).map((e) => (
                    <p key={`${e.rowNumber}-${e.error}`} className="text-amber-700 dark:text-amber-300">
                      Row {e.rowNumber}: {e.error}
                    </p>
                  ))}
                  {rowErrors.length + validated.invalid.length > 6 ? (
                    <p className="text-muted-foreground">
                      +{" "}
                      {rowErrors.length + validated.invalid.length - 6} more
                      issues…
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {showPreview ? (
            <div className="overflow-hidden rounded-xl border border-border/70">
              <div className="bg-muted/40 border-b border-border/70 px-3 py-2 text-xs font-semibold">
                Preview (first {previewRows.length})
              </div>
              <div className="max-h-[220px] overflow-auto">
                <div className="min-w-[840px]">
                  <div
                    className="grid bg-muted/20 text-xs font-semibold text-muted-foreground"
                    style={{
                      gridTemplateColumns:
                        "70px 180px 240px 160px 150px 150px 120px",
                    }}
                  >
                    {["Row", "Name", "Email", "Role", "Department", "Team", "Join"].map(
                      (h, idx) => (
                        <div
                          key={h}
                          className={cn(
                            "px-3 py-2 border-b border-border/60",
                            idx < 6 ? "border-r border-border/60" : null,
                          )}
                        >
                          {h}
                        </div>
                      ),
                    )}
                  </div>
                  {previewRows.map((r) => (
                    <div
                      key={r.rowNumber}
                      className="grid text-xs"
                      style={{
                        gridTemplateColumns:
                          "70px 180px 240px 160px 150px 150px 120px",
                      }}
                    >
                      <div className="px-3 py-2 border-b border-r border-border/60 tabular-nums text-muted-foreground">
                        {r.rowNumber}
                      </div>
                      <div className="px-3 py-2 border-b border-r border-border/60 truncate">
                        {r.name || "—"}
                      </div>
                      <div className="px-3 py-2 border-b border-r border-border/60 truncate text-muted-foreground">
                        {r.email || "—"}
                      </div>
                      <div className="px-3 py-2 border-b border-r border-border/60 truncate">
                        {r.role || "—"}
                      </div>
                      <div className="px-3 py-2 border-b border-r border-border/60 truncate">
                        {r.department || "—"}
                      </div>
                      <div className="px-3 py-2 border-b border-r border-border/60 truncate">
                        {r.team_name || "—"}
                      </div>
                      <div className="px-3 py-2 border-b border-border/60 truncate text-muted-foreground">
                        {r.join_date || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-border/70 bg-muted/10 p-3 text-xs">
              <p className="text-muted-foreground">
                Created{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {result.created}
                </span>
                {" · "}Skipped duplicates{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {result.skippedDuplicates}
                </span>
                {" · "}Errors{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {result.errors.length}
                </span>
              </p>
              {result.skipped.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-muted-foreground font-medium">
                    Skipped duplicates (showing up to 10)
                  </p>
                  <div className="max-h-[160px] overflow-auto rounded-lg border border-border/60 bg-background/70 p-2">
                    <div className="space-y-1">
                      {result.skipped.slice(0, 50).map((s) => (
                        <p
                          key={`${s.rowNumber}-${s.email}-${s.reason}`}
                          className="text-muted-foreground"
                        >
                          Row {s.rowNumber}: {s.email} — {s.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                  {result.skipped.length > 50 ? (
                    <p className="text-muted-foreground">
                      + {result.skipped.length - 50} more duplicates…
                    </p>
                  ) : null}
                </div>
              ) : null}
              {result.errors.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-muted-foreground font-medium">
                    Import errors (showing up to 50)
                  </p>
                  <div className="max-h-[160px] overflow-auto rounded-lg border border-border/60 bg-background/70 p-2">
                    <div className="space-y-1">
                  {result.errors.slice(0, 50).map((e) => (
                    <p key={`${e.rowNumber}-${e.email ?? ""}-${e.error}`} className="text-amber-700 dark:text-amber-300">
                      {e.rowNumber ? `Row ${e.rowNumber}` : "Import"}: {e.error}
                    </p>
                  ))}
                    </div>
                  </div>
                  {result.errors.length > 50 ? (
                    <p className="text-muted-foreground">
                      + {result.errors.length - 50} more errors…
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>

        <div className="bg-muted/50 border-border/60 sticky bottom-0 z-10 border-t px-4 py-3">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={busy || validated.valid.length === 0}
              onClick={() => void runImport()}
              className="gap-2"
              title={
                validated.valid.length === 0
                  ? "Upload a CSV with at least one valid row to import."
                  : undefined
              }
            >
              {busy ? "Importing…" : `Import ${validated.valid.length} employees`}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}

