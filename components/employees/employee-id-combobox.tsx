"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronsUpDownIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type EmployeeIdOption = {
  employee_code: string;
  name: string;
};

export function EmployeeIdCombobox({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  options: EmployeeIdOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}): React.ReactElement {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [panelRect, setPanelRect] = React.useState<{
    left: number;
    top: number;
    width: number;
    panelMaxHeight: number;
    listMaxHeight: number;
    placement: "top" | "bottom";
  } | null>(null);

  const normalizedOptions = React.useMemo(() => {
    return options
      .map((o) => ({
        employee_code: (o.employee_code ?? "").trim(),
        name: (o.name ?? "").trim(),
      }))
      .filter((o) => o.employee_code.length > 0);
  }, [options]);

  const selected = React.useMemo(() => {
    const key = value.trim();
    if (!key) return null;
    return normalizedOptions.find((o) => o.employee_code === key) ?? null;
  }, [normalizedOptions, value]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((o) => {
      return (
        o.employee_code.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q)
      );
    });
  }, [normalizedOptions, query]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const root = rootRef.current;
      const panel = panelRef.current;
      if (!root) return;
      if (!(e.target instanceof Node)) return;
      if (root.contains(e.target)) return;
      if (panel && panel.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 6;
      const viewportH = window.innerHeight || 800;
      const spaceBelow = viewportH - (r.bottom + margin) - 12;
      const spaceAbove = r.top - margin - 12;
      const preferTop = spaceBelow < 240 && spaceAbove > spaceBelow;
      const available = preferTop ? spaceAbove : spaceBelow;
      // Keep a stable, comfortable max height and fall back to available space.
      const desiredPanelMax = 420;
      const headerHeight = 48; // search row + border
      const panelMaxHeight = Math.max(
        240,
        Math.min(desiredPanelMax, Math.max(240, available)),
      );
      const listMaxHeight = Math.max(160, panelMaxHeight - headerHeight);
      setPanelRect({
        left: Math.round(r.left),
        top: preferTop
          ? Math.round(Math.max(12, r.top - margin)) // will be adjusted by panel height via transform
          : Math.round(r.bottom + margin),
        width: Math.round(r.width),
        panelMaxHeight,
        listMaxHeight,
        placement: preferTop ? "top" : "bottom",
      });
    };
    update();
    window.addEventListener("resize", update);
    // Capture scroll on any scrollable ancestor.
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const label = selected ? `${selected.employee_code} · ${selected.name}` : "";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        ref={anchorRef}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        className={cn(
          "border-input bg-background text-foreground",
          "h-8 w-full rounded-lg border px-2.5 text-sm",
          "flex items-center justify-between gap-2",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
          disabled ? "pointer-events-none cursor-not-allowed opacity-50" : null,
        )}
        tabIndex={disabled ? -1 : 0}
        data-disabled={disabled ? "" : undefined}
        aria-disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        role="button"
      >
        <span
          className={cn(
            "min-w-0 truncate text-left",
            label ? null : "text-muted-foreground",
          )}
        >
          {label || placeholder || "Select…"}
        </span>
        <span className="flex items-center gap-1">
          {value.trim() ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              title="Clear"
            >
              <XIcon className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" aria-hidden />
        </span>
      </div>

      {open && panelRect
        ? createPortal(
            <div
              ref={panelRef}
              className={cn(
                "border-border/70 bg-popover text-popover-foreground",
                "fixed z-[100] rounded-xl border shadow-lg overflow-hidden",
              )}
              style={{
                left: panelRect.left,
                top: panelRect.top,
                width: panelRect.width,
                transform:
                  panelRect.placement === "top" ? "translateY(-100%)" : undefined,
                maxHeight: panelRect.panelMaxHeight,
              }}
              role="listbox"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="border-border/60 border-b p-2">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search employee ID or name…"
                  className="h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                  }}
                />
              </div>
              <div
                className="overflow-y-auto overscroll-contain p-1"
                style={{ maxHeight: panelRect.listMaxHeight }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {filtered.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-sm">
                    No matches.
                  </div>
                ) : (
                  filtered.map((o) => {
                    const isActive = value.trim() === o.employee_code;
                    return (
                      <button
                        key={o.employee_code}
                        type="button"
                        className={cn(
                          "hover:bg-muted/60 w-full rounded-lg px-3 py-2 text-left text-sm",
                          "flex items-center justify-between gap-3",
                          isActive ? "bg-muted/60" : null,
                        )}
                        onClick={() => {
                          onChange(o.employee_code);
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <span className="min-w-0">
                          <span className="font-medium tabular-nums">
                            {o.employee_code}
                          </span>
                          <span className="text-muted-foreground ml-2 truncate">
                            {o.name}
                          </span>
                        </span>
                        {isActive ? (
                          <span className="text-primary text-xs font-semibold">
                            Selected
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

