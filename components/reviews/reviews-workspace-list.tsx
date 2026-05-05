"use client";

import * as React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/database";

export type WorkspaceReviewRow = {
  id: string;
  title: string | null;
  status: ReviewStatus;
  rating: number | null;
  created_at: string;
  employee_id: string;
  employeeName: string;
};

function badgeVariant(
  status: ReviewStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "archived":
      return "secondary";
    default:
      return "outline";
  }
}

function statusLabel(status: ReviewStatus): string {
  switch (status) {
    case "published":
      return "Finalized";
    case "archived":
      return "Shelved";
    default:
      return "Draft";
  }
}

export function ReviewsWorkspaceList({
  rows,
  highlight,
}: {
  rows: WorkspaceReviewRow[];
  highlight: string | null;
}): React.ReactElement {
  React.useEffect(() => {
    if (!highlight) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`review-row-${highlight}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [highlight]);

  return (
    <ul className="divide-border/70 mx-auto mt-6 max-w-3xl divide-y rounded-2xl border border-border/70 bg-card/50 shadow-[0_24px_64px_-32px_rgba(15,23,42,0.25)] backdrop-blur-sm">
      {rows.map((row) => {
        const isHi = highlight === row.id;
        return (
          <li
            key={row.id}
            id={`review-row-${row.id}`}
            className={cn(
              "scroll-mt-24 transition-[background-color,box-shadow] duration-300",
              isHi &&
                "bg-primary/8 ring-primary/40 ring-2 ring-offset-2 ring-offset-background",
            )}
          >
            <div className="hover:bg-muted/48 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
              <Link
                href={`/employees/${row.employee_id}/insights?tab=reviews`}
                className="min-w-0 flex-1 text-left transition-colors"
              >
                <p className="text-foreground truncate font-medium">
                  {row.title?.trim() || "Performance review"}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {row.employeeName}
                  <span className="mx-1.5 opacity-40">·</span>
                  {new Date(row.created_at).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </p>
              </Link>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Badge
                  variant={badgeVariant(row.status)}
                  className="font-normal"
                >
                  {statusLabel(row.status)}
                </Badge>
                {typeof row.rating === "number" ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {row.rating}/5
                  </span>
                ) : null}
                <Link
                  href={`/reviews?highlight=${row.id}`}
                  className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 transition-colors hover:underline"
                >
                  Hub focus
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
