"use client";

import { motion, useReducedMotion } from "motion/react";

/** Soft aurora mesh — unobtrusive SaaS backdrop. */
export function AmbientBackdrop() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,var(--muted)_0%,var(--background)_45%,color-mix(in_oklch,var(--primary)_12%,transparent)_100%)]"
        aria-hidden
      />
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="from-background absolute inset-0 bg-gradient-to-b via-transparent to-[color-mix(in_oklch,var(--primary)_6%,transparent)]" />
      <motion.div
        className="absolute -top-[20%] left-1/4 size-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle,color-mix(in oklch, var(--primary) 42%, transparent) 0%, transparent 72%)",
        }}
        animate={{ x: [-30, 20, -30], y: [-20, 10, -20], scale: [1, 1.05, 1] }}
        transition={{
          duration: 18,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -right-[15%] top-1/3 size-[480px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle,color-mix(in oklch, oklch(0.72 0.15 295) 28%, transparent) 0%, transparent 72%)",
        }}
        animate={{ x: [20, -25, 20], scale: [1, 1.08, 1] }}
        transition={{
          duration: 22,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-0 left-[10%] size-[380px] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle,color-mix(in oklch, oklch(0.75 0.12 200) 22%, transparent) 0%, transparent 70%)",
        }}
        animate={{ y: [0, -25, 0], opacity: [0.5, 0.75, 0.5] }}
        transition={{
          duration: 16,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <div className="bg-grid-soft absolute inset-0 opacity-[0.35]" />
    </div>
  );
}
