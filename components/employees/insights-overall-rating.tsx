"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

function useAnimatedScore(target: number | null, durationMs: number): number {
  const reduced = useReducedMotion() === true;
  const [value, setValue] = React.useState(() => (reduced ? target ?? 0 : 0));

  React.useEffect(() => {
    if (target === null) {
      setValue(0);
      return;
    }
    if (reduced) {
      setValue(target);
      return;
    }
    const end = target;
    let start: number | null = null;
    const from = 0;
    let frameId = 0;
    function tick(now: number): void {
      if (start === null) start = now;
      const p = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - p) ** 3;
      setValue(from + (end - from) * eased);
      if (p < 1) frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs, reduced]);

  return target === null ? 0 : value;
}

export function InsightsOverallRating({
  scoreOutOf10,
  reviewLabel,
  reviewDateLabel,
  className,
}: {
  scoreOutOf10: number | null;
  reviewLabel: string;
  reviewDateLabel: string | null;
  className?: string;
}): React.ReactElement {
  const reduced = useReducedMotion() === true;
  const animated = useAnimatedScore(scoreOutOf10, 1400);

  const ringR = 42;
  const ringC = 2 * Math.PI * ringR;
  const fillRatio = scoreOutOf10 === null ? 0 : animated / 10;

  const displayValue =
    scoreOutOf10 === null
      ? "—"
      : animated.toFixed(
          scoreOutOf10 !== null && Number.isInteger(scoreOutOf10) ? 0 : 1,
        );

  return (
    <motion.div
      className={cn(
        "border-border/60 from-primary/[0.07] relative flex flex-col items-center justify-center rounded-2xl border bg-gradient-to-br to-transparent px-6 py-5 shadow-inner md:min-w-[200px]",
        className,
      )}
      initial={reduced ? false : { opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <div
        aria-hidden
        className="bg-primary/12 absolute inset-0 rounded-2xl opacity-80 blur-2xl"
      />
      <motion.div
        className="relative mb-3 flex size-[7.25rem] items-center justify-center"
        initial={reduced ? false : { rotate: -8 }}
        animate={{ rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
      >
        <svg
          className="text-primary/25 absolute size-full -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
          />
        </svg>
        <svg
          className="text-primary absolute size-full -rotate-90 drop-shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={ringR}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={ringC}
            strokeDashoffset={ringC * (1 - fillRatio)}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Overall
          </span>
          <motion.span
            className="font-heading text-foreground text-4xl font-bold tabular-nums tracking-tight"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            {displayValue}
          </motion.span>
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            / 10
          </span>
        </div>
      </motion.div>
      <p className="text-muted-foreground relative max-w-[14rem] text-center text-[11px] leading-snug">
        {scoreOutOf10 === null ? (
          "Add dimension or overall ratings to roll-up reviews to see your average here."
        ) : (
          <>
            <span className="text-foreground font-medium">{reviewLabel}</span>
            {reviewDateLabel ? (
              <>
                {" "}
                <span className="tabular-nums">· {reviewDateLabel}</span>
              </>
            ) : null}
          </>
        )}
      </p>
    </motion.div>
  );
}
