"use client";

import type { ReactElement } from "react";
import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { ScorePoint } from "@/lib/review-cadence";

function shortAxisLabel(sortKey: string): string {
  const day = sortKey.slice(0, 10);
  const parts = day.split("-");
  if (parts.length !== 3) return sortKey.slice(0, 10);
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return day;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function PerformanceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ChartRow }>;
}): React.ReactNode {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const score = payload[0]?.value;
  if (row === undefined || typeof score !== "number") return null;

  return (
    <div
      className={cn(
        "border-border/70 bg-popover text-popover-foreground shadow-lg",
        "border px-3 py-2.5 text-left",
        "rounded-xl backdrop-blur-md",
      )}
    >
      <p className="text-muted-foreground mb-0.5 text-[11px] font-medium tracking-wide uppercase">
        Period
      </p>
      <p className="text-foreground text-sm font-medium leading-snug">{row.name}</p>
      <p className="text-primary mt-2 font-heading text-xl font-bold tabular-nums tracking-tight">
        {score}
        <span className="text-muted-foreground text-sm font-semibold"> / 10</span>
      </p>
    </div>
  );
}

type ChartRow = {
  name: string;
  score: number;
  sortKey: string;
  axisLabel: string;
};

export function InsightsPerformanceChart({
  series,
}: {
  series: ScorePoint[];
}): ReactElement {
  const gradId = React.useId().replace(/:/g, "");

  const chartData: ChartRow[] = series
    .filter((p): p is ScorePoint & { score10: number } => p.score10 !== null)
    .map((p) => ({
      name: p.label,
      score: p.score10,
      sortKey: p.sortKey,
      axisLabel: shortAxisLabel(p.sortKey),
    }));

  const avgScore =
    chartData.length > 0
      ? Math.round(
          (chartData.reduce((acc, row) => acc + row.score, 0) / chartData.length) *
            10,
        ) / 10
      : null;

  if (chartData.length === 0) {
    return (
      <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm leading-relaxed">
        <p className="font-medium text-foreground/80">No trend yet</p>
        <p className="mx-auto mt-2 max-w-sm">
          Add dimension or checklist scores on roll-up reviews to plot scores over time.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {avgScore !== null ? (
        <div className="text-muted-foreground flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-xs">
          <span>
            <span className="text-foreground font-semibold tabular-nums">
              {avgScore}
            </span>
            <span className="tabular-nums"> / 10 avg</span>
          </span>
          <span className="text-border hidden sm:inline">·</span>
          <span className="tabular-nums">{chartData.length} data points</span>
        </div>
      ) : null}

      <div
        className={cn(
          "text-primary w-full",
          "[&_.recharts-cartesian-grid-horizontal_line]:stroke-border/40",
          "[&_.recharts-cartesian-grid-vertical_line]:stroke-border/25",
        )}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 16, right: 8, left: -8, bottom: 4 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.22}
                />
                <stop
                  offset="75%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.04}
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="axisLabel"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))", strokeOpacity: 0.6 }}
              tickMargin={10}
              interval="preserveStartEnd"
            />

            <YAxis
              domain={[0, 10]}
              width={40}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              ticks={[0, 2.5, 5, 7.5, 10]}
              tickMargin={6}
            />

            <ReferenceLine
              y={5}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.35}
              strokeDasharray="4 6"
            />

            <Tooltip
              cursor={{
                stroke: "hsl(var(--primary))",
                strokeWidth: 1,
                strokeOpacity: 0.35,
                strokeDasharray: "4 4",
              }}
              content={<PerformanceTooltip />}
            />

            <Area
              type="monotone"
              dataKey="score"
              stroke="none"
              fill={`url(#${gradId})`}
              isAnimationActive
              animationDuration={600}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{
                r: 5,
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 7,
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
