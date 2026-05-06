"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Maximize2Icon,
  NetworkIcon,
  RowsIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { easingOut } from "@/lib/motion-variants";

export type HierarchyEmployeeRow = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  employee_code?: string | null;
  is_active?: boolean | null;
  team_name?: string | null;
  department?: string | null;
  /** True when this employee is the assigned lead of their team. */
  is_lead?: boolean;
};

type Mode = "tree" | "list" | "canvas";

type Node = {
  id: string;
  name: string;
  employee_code: string;
  is_active: boolean;
  is_lead: boolean;
  children: string[];
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildIndex(rows: HierarchyEmployeeRow[]): {
  nodes: Map<string, Node>;
  roots: string[];
  parentById: Map<string, string>;
} {
  const nodes = new Map<string, Node>();
  for (const r of rows) {
    nodes.set(r.id, {
      id: r.id,
      name: r.name ?? "—",
      employee_code: (r.employee_code ?? "").trim(),
      is_active: r.is_active !== false,
      is_lead: r.is_lead === true,
      children: [],
    });
  }

  // Group by team; make the lead the parent of all other team members.
  const teamLeadId = new Map<string, string>(); // teamName → lead's employee id
  const teamMemberIds = new Map<string, string[]>(); // teamName → all member ids
  for (const r of rows) {
    const team = r.team_name?.trim();
    if (!team) continue;
    if (!teamMemberIds.has(team)) teamMemberIds.set(team, []);
    teamMemberIds.get(team)!.push(r.id);
    if (r.is_lead) teamLeadId.set(team, r.id);
  }

  const parentById = new Map<string, string>();
  for (const [team, memberIds] of teamMemberIds) {
    const leadId = teamLeadId.get(team);
    if (!leadId) continue;
    const leadNode = nodes.get(leadId);
    if (!leadNode) continue;
    for (const memberId of memberIds) {
      if (memberId === leadId) continue;
      leadNode.children.push(memberId);
      parentById.set(memberId, leadId);
    }
    leadNode.children.sort((a, b) =>
      (nodes.get(a)?.name ?? "").localeCompare(nodes.get(b)?.name ?? "", undefined, { sensitivity: "base" }),
    );
  }

  // Roots = nodes that are not a child of anyone.
  const allChildren = new Set<string>();
  for (const n of nodes.values()) {
    for (const c of n.children) allChildren.add(c);
  }
  const roots = [...nodes.keys()]
    .filter((id) => !allChildren.has(id))
    .sort((a, b) =>
      (nodes.get(a)?.name ?? "").localeCompare(nodes.get(b)?.name ?? "", undefined, { sensitivity: "base" }),
    );

  // Single virtual root if there are multiple top-level nodes.
  if (roots.length > 1) {
    const virtualId = "__org_root__";
    nodes.set(virtualId, {
      id: virtualId,
      name: "Organisation",
      employee_code: "",
      is_active: true,
      is_lead: false,
      children: roots,
    });
    for (const r of roots) parentById.set(r, virtualId);
    return { nodes, roots: [virtualId], parentById };
  }

  return { nodes, roots, parentById };
}

function label(node: Node): string {
  const code = node.employee_code ? ` · ${node.employee_code}` : "";
  return `${node.name}${code}`;
}

type LayoutPos = { x: number; y: number };

function layoutTree(nodes: Map<string, Node>, roots: string[]): {
  posById: Map<string, LayoutPos>;
  edges: Array<{ from: string; to: string }>;
} {
  const posById = new Map<string, LayoutPos>();
  const edges: Array<{ from: string; to: string }> = [];
  const seen = new Set<string>();

  const NODE_GAP_X = 220;
  const NODE_GAP_Y = 140;

  // Basic tidy-ish layout: compute subtree widths (in leaf units), then place children centered.
  const widthMemo = new Map<string, number>();
  const subtreeWidth = (id: string): number => {
    if (widthMemo.has(id)) return widthMemo.get(id)!;
    const n = nodes.get(id);
    if (!n || n.children.length === 0) {
      widthMemo.set(id, 1);
      return 1;
    }
    let sum = 0;
    for (const c of n.children) sum += subtreeWidth(c);
    const w = Math.max(1, sum);
    widthMemo.set(id, w);
    return w;
  };

  const place = (id: string, depth: number, left: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodes.get(id);
    if (!n) return;
    const w = subtreeWidth(id);
    const center = left + w / 2;
    posById.set(id, { x: center * NODE_GAP_X, y: depth * NODE_GAP_Y });

    let cursor = left;
    for (const c of n.children) {
      edges.push({ from: id, to: c });
      const cw = subtreeWidth(c);
      place(c, depth + 1, cursor);
      cursor += cw;
    }
  };

  let cursor = 0;
  for (const r of roots) {
    const rw = subtreeWidth(r);
    place(r, 0, cursor);
    cursor += rw + 0.75; // small spacing between multiple roots (rare due to synthetic root)
  }

  return { posById, edges };
}

function useAutoExpandForQuery(args: {
  nodes: Map<string, Node>;
  roots: string[];
  parentById: Map<string, string>;
  query: string;
}): { expanded: Set<string>; matches: Set<string> } {
  const { nodes, roots, parentById, query } = args;
  return React.useMemo(() => {
    const q = norm(query);
    if (!q) return { expanded: new Set<string>(), matches: new Set<string>() };

    const matches = new Set<string>();
    for (const n of nodes.values()) {
      const hay = `${n.name} ${n.employee_code}`.toLowerCase();
      if (hay.includes(q)) matches.add(n.id);
    }

    const expanded = new Set<string>();
    const visited = new Set<string>();

    const markAncestors = (id: string) => {
      let cur: string | undefined = id;
      while (cur) {
        const parentId = parentById.get(cur);
        if (!parentId || visited.has(parentId)) break;
        visited.add(parentId);
        expanded.add(parentId);
        cur = parentId;
      }
    };

    for (const id of matches) markAncestors(id);

    // If query matches nothing, keep collapsed.
    if (matches.size === 0) return { expanded: new Set<string>(), matches };

    // Expand roots so users see the entry points.
    for (const r of roots) expanded.add(r);
    return { expanded, matches };
  }, [nodes, roots, parentById, query]);
}

function NodeRow({
  node,
  depth,
  hasChildren,
  expanded,
  onToggle,
  highlight,
}: {
  node: Node;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  highlight: boolean;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5",
        highlight ? "bg-primary/8 border border-primary/15" : "hover:bg-muted/40",
      )}
      style={{ paddingLeft: 8 + depth * 18 }}
    >
      <button
        type="button"
        className={cn(
          "grid size-6 place-items-center rounded-md border border-border/60 bg-background/60 text-muted-foreground",
          hasChildren ? "hover:text-foreground" : "opacity-40 cursor-default",
        )}
        onClick={() => {
          if (!hasChildren) return;
          onToggle();
        }}
        aria-label={hasChildren ? (expanded ? "Collapse" : "Expand") : "No reports"}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDownIcon className="size-4" aria-hidden />
          ) : (
            <ChevronRightIcon className="size-4" aria-hidden />
          )
        ) : (
          <span className="block size-1.5 rounded-full bg-muted-foreground/50" />
        )}
      </button>

      <Link
        href={`/employees/${node.id}/insights`}
        className="min-w-0 flex-1"
        title={label(node)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{node.name}</span>
          {node.employee_code ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              · {node.employee_code}
            </span>
          ) : null}
          {node.is_lead ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 font-normal">
              Lead
            </Badge>
          ) : null}
          {!node.is_active ? (
            <Badge variant="outline" className="text-muted-foreground font-normal">
              Inactive
            </Badge>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

function CollapsibleList({
  nodes,
  roots,
  expanded,
  setExpanded,
  matches,
}: {
  nodes: Map<string, Node>;
  roots: string[];
  expanded: Set<string>;
  setExpanded: (next: Set<string>) => void;
  matches: Set<string>;
}): React.ReactElement {
  const render = (id: string, depth: number, seen: Set<string>): React.ReactNode => {
    if (seen.has(id)) return null;
    seen.add(id);
    const node = nodes.get(id);
    if (!node) return null;
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(id);
    const highlight = matches.has(id);

    return (
      <React.Fragment key={id}>
        <NodeRow
          node={node}
          depth={depth}
          hasChildren={hasChildren}
          expanded={isExpanded}
          onToggle={() => {
            const next = new Set(expanded);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            setExpanded(next);
          }}
          highlight={highlight}
        />
        {hasChildren && isExpanded
          ? node.children.map((childId) => render(childId, depth + 1, seen))
          : null}
      </React.Fragment>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-1">
      {roots.map((r) => render(r, 0, new Set<string>()))}
    </div>
  );
}

function TreeBox({
  node,
  highlight,
}: {
  node: Node;
  highlight: boolean;
}): React.ReactElement {
  return (
    <Link
      href={`/employees/${node.id}/insights`}
      className={cn(
        "border-border/70 bg-card/70 hover:border-primary/25 inline-flex max-w-[240px] flex-col rounded-xl border px-3 py-2 shadow-sm transition-colors",
        highlight ? "border-primary/30 bg-primary/[0.06]" : null,
      )}
      title={label(node)}
    >
      <span className="truncate text-sm font-semibold">{node.name}</span>
      <span className="text-muted-foreground truncate text-xs tabular-nums">
        {node.employee_code ? node.employee_code : "—"}
      </span>
      {node.is_lead ? (
        <span className="text-emerald-500 mt-0.5 text-[11px] font-semibold">Lead</span>
      ) : null}
      {!node.is_active ? (
        <span className="text-muted-foreground mt-1 text-[11px] font-semibold">
          Inactive
        </span>
      ) : null}
    </Link>
  );
}

function TreeView({
  nodes,
  roots,
  expanded,
  setExpanded,
  matches,
}: {
  nodes: Map<string, Node>;
  roots: string[];
  expanded: Set<string>;
  setExpanded: (next: Set<string>) => void;
  matches: Set<string>;
}): React.ReactElement {
  const render = (id: string, depth: number, seen: Set<string>): React.ReactNode => {
    if (seen.has(id)) return null;
    seen.add(id);
    const node = nodes.get(id);
    if (!node) return null;
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(id);
    const highlight = matches.has(id);

    return (
      <li key={id} className="relative flex flex-col items-center">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              className="border-border/60 bg-background/70 text-muted-foreground hover:text-foreground grid size-7 place-items-center rounded-lg border"
              onClick={() => {
                const next = new Set(expanded);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                setExpanded(next);
              }}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDownIcon className="size-4" aria-hidden />
              ) : (
                <ChevronRightIcon className="size-4" aria-hidden />
              )}
            </button>
          ) : null}
          <TreeBox node={node} highlight={highlight} />
        </div>

        {hasChildren && isExpanded ? (
          <ul className="mt-4 flex flex-wrap items-start justify-center gap-6">
            {node.children.map((childId) => render(childId, depth + 1, seen))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <div className="overflow-x-auto">
      <ul className="mx-auto w-max space-y-6 px-2 py-2">
        {roots.map((r) => render(r, 0, new Set<string>()))}
      </ul>
    </div>
  );
}

function OrgHierarchyCanvas({
  nodes,
  roots,
  matches,
}: {
  nodes: Map<string, Node>;
  roots: string[];
  matches: Set<string>;
}): React.ReactElement {
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { posById, edges } = React.useMemo(() => layoutTree(nodes, roots), [nodes, roots]);

  const NODE_W = 180;
  const NODE_H = 64;

  const [view, setView] = React.useState<{ k: number; x: number; y: number }>({
    k: 1,
    x: 24,
    y: 24,
  });
  const dragRef = React.useRef<{
    dragging: boolean;
    lastX: number;
    lastY: number;
  } | null>(null);

  const bounds = React.useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [, p] of posById.entries()) {
      const x = p.x;
      const y = p.y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (!isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 0;
      maxY = 0;
    }
    return {
      minX: minX - NODE_W / 2,
      minY: minY - NODE_H / 2,
      maxX: maxX + NODE_W / 2,
      maxY: maxY + NODE_H / 2,
    };
  }, [NODE_H, NODE_W, posById]);

  const fitToView = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 24;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const bw = Math.max(1, bounds.maxX - bounds.minX);
    const bh = Math.max(1, bounds.maxY - bounds.minY);
    const k = clamp(Math.min((w - pad * 2) / bw, (h - pad * 2) / bh), 0.35, 1.6);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    setView({
      k,
      x: w / 2 - cx * k,
      y: h / 2 - cy * k,
    });
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY]);

  React.useEffect(() => {
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, roots]);

  const zoom = (delta: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setView((v) => {
      const nextK = clamp(v.k * (1 + delta), 0.2, 2.6);
      const wx = (cx - v.x) / v.k;
      const wy = (cy - v.y) / v.k;
      return {
        k: nextK,
        x: cx - wx * nextK,
        y: cy - wy * nextK,
      };
    });
  };

  const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setView((v) => {
      const nextK = clamp(v.k * factor, 0.2, 2.6);
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      return { k: nextK, x: px - wx * nextK, y: py - wy * nextK };
    });
  };

  const onPointerDown: React.PointerEventHandler<SVGSVGElement> = (e) => {
    // Pan with drag.
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
  };
  const onPointerMove: React.PointerEventHandler<SVGSVGElement> = (e) => {
    const d = dragRef.current;
    if (!d?.dragging) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const onPointerUp: React.PointerEventHandler<SVGSVGElement> = (e) => {
    const d = dragRef.current;
    if (!d) return;
    d.dragging = false;
    try {
      (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const arrowId = React.useId();

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background/40">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => zoom(0.12)}>
          <ZoomInIcon className="size-4" aria-hidden />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => zoom(-0.12)}>
          <ZoomOutIcon className="size-4" aria-hidden />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={fitToView}>
          <Maximize2Icon className="size-4" aria-hidden />
        </Button>
      </div>

      <div ref={containerRef} className="absolute inset-0">
        <svg
          className="h-full w-full cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="img"
          aria-label="Org hierarchy canvas"
        >
          <defs>
            <marker
              id={arrowId}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
            {/* edges */}
            <g className="text-muted-foreground">
              {edges.map((e) => {
                const a = posById.get(e.from);
                const b = posById.get(e.to);
                if (!a || !b) return null;
                const x1 = a.x;
                const y1 = a.y + NODE_H / 2;
                const x2 = b.x;
                const y2 = b.y - NODE_H / 2;
                const midY = (y1 + y2) / 2;
                const d = `M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`;
                return (
                  <path
                    key={`${e.from}->${e.to}`}
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeDasharray="4 4"
                    markerEnd={`url(#${arrowId})`}
                    opacity={0.75}
                  />
                );
              })}
            </g>

            {/* nodes */}
            {[...posById.entries()].map(([id, p]) => {
              const n = nodes.get(id);
              if (!n) return null;
              const x = p.x - NODE_W / 2;
              const y = p.y - NODE_H / 2;
              const highlight = matches.has(id);
              return (
                <g
                  key={id}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => {
                    if (id === "__org_root__") return;
                    router.push(`/employees/${id}/insights`);
                  }}
                  style={{ cursor: id === "__org_root__" ? "default" : "pointer" }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx="14"
                    ry="14"
                    fill={highlight ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.7)"}
                    stroke={highlight ? "rgba(59,130,246,0.35)" : "rgba(0,0,0,0.12)"}
                    strokeWidth="1.2"
                  />
                  <text
                    x={12}
                    y={26}
                    fontSize="13"
                    fontWeight="700"
                    fill="rgba(0,0,0,0.86)"
                  >
                    {n.name.length > 18 ? `${n.name.slice(0, 18)}…` : n.name}
                  </text>
                  <text x={12} y={46} fontSize="11" fill="rgba(0,0,0,0.55)">
                    {n.employee_code ? n.employee_code : "—"}
                    {!n.is_active ? " · Inactive" : ""}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export function OrgHierarchyPanel({
  employees,
  defaultMode = "canvas",
}: {
  employees: HierarchyEmployeeRow[];
  defaultMode?: Mode;
}): React.ReactElement {
  const reduced = useReducedMotion() === true;
  const { nodes, roots, parentById } = React.useMemo(() => buildIndex(employees), [employees]);
  const [mode, setMode] = React.useState<Mode>(defaultMode);
  const [query, setQuery] = React.useState("");

  const { expanded: autoExpanded, matches } = useAutoExpandForQuery({
    nodes,
    roots,
    parentById,
    query,
  });
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(roots));

  React.useEffect(() => {
    // Keep a sane default after data refresh (e.g. new employees imported).
    if (norm(query).length !== 0) return;
    setExpanded(new Set(roots));
  }, [query, roots]);

  React.useEffect(() => {
    // When searching, follow the auto-expanded view; when cleared, keep current state.
    if (norm(query).length === 0) return;
    setExpanded(autoExpanded);
  }, [autoExpanded, query]);

  const expandAll = () => setExpanded(new Set(nodes.keys()));
  const collapseAll = () => setExpanded(new Set());

  return (
    <Card className="border-border/70 shadow-md">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Org hierarchy</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            View reporting structure across your workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-2 size-4" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or Employee ID…"
              className="h-8 w-[240px] pl-8"
            />
          </div>
          <div className="bg-muted/40 flex rounded-full border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() => setMode("canvas")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "canvas"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setMode("tree")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "tree"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <NetworkIcon className="size-3.5" aria-hidden />
              Tree
            </button>
            <button
              type="button"
              onClick={() => setMode("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <RowsIcon className="size-3.5" aria-hidden />
              List
            </button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
            Collapse
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={expandAll}>
            Expand
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={reduced ? false : { opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.28, ease: easingOut }}
          className="h-[420px] overflow-hidden rounded-2xl border border-border/70 bg-card/50 p-3"
        >
          <div className="h-full overflow-y-auto overscroll-contain pr-1">
            {employees.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-sm">
                No employees yet.
              </p>
            ) : mode === "list" ? (
              <CollapsibleList
                nodes={nodes}
                roots={roots}
                expanded={expanded}
                setExpanded={setExpanded}
                matches={matches}
              />
            ) : mode === "canvas" ? (
              <div className="h-full">
                <OrgHierarchyCanvas nodes={nodes} roots={roots} matches={matches} />
              </div>
            ) : (
              <TreeView
                nodes={nodes}
                roots={roots}
                expanded={expanded}
                setExpanded={setExpanded}
                matches={matches}
              />
            )}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

