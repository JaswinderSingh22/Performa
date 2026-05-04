"use client";

import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";

/** Global navigation affordances (top progress bar). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <NextTopLoader
        color="oklch(0.488 0.19 266)"
        crawlSpeed={100}
        height={3}
        showSpinner={false}
        speed={260}
        shadow="0 0 14px oklch(0.488 0.19 266 / 0.35)"
        zIndex={99999}
      />
      {children}
    </>
  );
}
