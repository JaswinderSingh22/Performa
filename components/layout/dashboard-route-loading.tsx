"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

/**
 * Centered dashboard route loader — light theme, calm motion, quick brand recognition.
 */
export function DashboardRouteLoading(): ReactElement {
  const reduce = useReducedMotion() === true;

  return (
    <div
      className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page"
    >
      <motion.div
        className="border-border/70 bg-card/95 text-card-foreground relative w-full max-w-[380px] overflow-hidden rounded-2xl border shadow-[0_20px_50px_-24px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.04] backdrop-blur-sm"
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {!reduce ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_-20%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            aria-hidden
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-10 top-0 z-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-90" />

        <div className="relative z-[1] flex flex-col items-center gap-7 px-8 py-10 sm:px-10">
          <div className="flex flex-col items-center gap-3">
            {reduce ? (
              <div className="relative flex size-12 items-center justify-center">
                <Image
                  src="/brand/performaai-mark.png"
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-2xl border border-border/60 shadow-sm"
                />
              </div>
            ) : (
              <motion.div
                className="relative flex size-12 items-center justify-center"
                animate={{ opacity: [0.88, 1, 0.88] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/brand/performaai-mark.png"
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-2xl border border-border/60 shadow-md ring-1 ring-black/[0.04]"
                />
              </motion.div>
            )}
            <p className="text-muted-foreground text-center text-[11px] font-semibold uppercase tracking-[0.18em]">
              PerformaAI
            </p>
          </div>

          <div className="relative flex size-[52px] shrink-0 items-center justify-center">
            {reduce ? (
              <div
                className="border-primary size-9 rounded-full border-2 border-t-transparent opacity-90 animate-spin"
                aria-hidden
              />
            ) : (
              <>
                <div
                  className="border-border/55 absolute inset-0 rounded-full border-2"
                  aria-hidden
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-primary border-r-violet-500/70"
                  style={{ borderLeftColor: "transparent", borderBottomColor: "transparent" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.95, repeat: Infinity, ease: "linear" }}
                  aria-hidden
                />
                <motion.div
                  className="bg-gradient-to-br from-primary/18 to-violet-500/10 absolute inset-[14px] rounded-full blur-[0.5px]"
                  animate={{ opacity: [0.5, 0.85, 0.5], scale: [0.96, 1, 0.96] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />
              </>
            )}
          </div>

          <div className="grid w-full max-w-[260px] grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) =>
              reduce ? (
                <div
                  key={i}
                  className="bg-muted/65 h-[42px] rounded-xl"
                  aria-hidden
                />
              ) : (
                <motion.div
                  key={i}
                  className="border-border/50 bg-muted/50 h-[42px] rounded-xl border border-dashed opacity-75"
                  animate={{ opacity: [0.35, 0.65, 0.35] }}
                  transition={{
                    duration: 1.35,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.11,
                  }}
                  aria-hidden
                />
              ),
            )}
          </div>

          <div className="space-y-1 text-center">
            <p className="font-sans text-[15px] font-medium leading-snug tracking-tight text-foreground">
              Loading workspace…
            </p>
            <p className="font-sans text-muted-foreground text-xs leading-relaxed">
              Syncing people, reviews, and your latest activity.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
