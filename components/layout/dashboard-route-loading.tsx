"use client";

import type { ReactElement } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Flex child centered in the dashboard main column — one card: spinner → lines → label.
 */
export function DashboardRouteLoading(): ReactElement {
  const reduce = useReducedMotion() === true;

  const barWidths = ["w-[58%]", "w-full", "w-[78%]"] as const;

  return (
    <div
      className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="border-border/80 bg-card text-card-foreground relative w-full max-w-[420px] overflow-hidden rounded-2xl border shadow-lg">
        {!reduce ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-primary/[0.045] via-transparent to-violet-500/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            aria-hidden
          />
        ) : null}

        <div className="relative z-[1] flex flex-col items-center gap-6 px-8 py-12 sm:px-10">
          {reduce ? (
            <div
              className="border-primary size-12 rounded-full border-2 border-t-transparent opacity-85 animate-spin"
              aria-hidden
            />
          ) : (
            <div className="relative flex size-14 shrink-0 items-center justify-center">
              <div
                className="border-muted/70 absolute inset-1 rounded-full border-2 opacity-70"
                aria-hidden
              />
              <motion.div
                className="border-primary absolute inset-1 rounded-full border-[2.5px] border-b-transparent border-l-transparent opacity-95"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
                aria-hidden
              />
              <div
                className="bg-gradient-to-br from-primary/25 to-violet-500/15 absolute inset-[18px] rounded-full"
                aria-hidden
              />
            </div>
          )}

          <div className="flex w-full flex-col items-center gap-3">
            {barWidths.map((w, i) =>
              reduce ? (
                <div
                  key={i}
                  className={`bg-muted/75 h-3 ${w} animate-pulse rounded-full`}
                />
              ) : (
                <motion.div
                  key={i}
                  className={`bg-muted/80 h-3 ${w} max-w-full rounded-full`}
                  animate={{ opacity: [0.42, 0.95, 0.42] }}
                  transition={{
                    duration: 1.15,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.12,
                  }}
                />
              ),
            )}
          </div>

          <p className="text-muted-foreground text-center text-[13px] font-medium leading-snug tracking-tight">
            Loading workspace…
          </p>
        </div>
      </div>
    </div>
  );
}
