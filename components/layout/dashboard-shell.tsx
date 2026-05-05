"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { BillingBanner } from "@/components/billing/billing-banner";
import type { BillingState } from "@/lib/billing/getBillingState";
import { easingOut } from "@/lib/motion-variants";

export function DashboardShell({
  children,
  billingState,
}: {
  children: ReactNode;
  billingState?: BillingState | null;
}) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion() === true;

  /* Avoid AnimatePresence `mode="wait"` — it serializes exit+enter (~2× animation delay)
     before the next route appears, which feels like a sluggish app on each click. */
  const pageWrapClass = "flex min-h-0 w-full flex-1 flex-col";

  const pageInner = prefersReducedMotion ? (
    <div className={pageWrapClass}>{children}</div>
  ) : (
    <motion.div
      key={pathname}
      className={pageWrapClass}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: easingOut }}
    >
      {children}
    </motion.div>
  );

  return (
    <div className="bg-background flex min-h-svh w-full flex-1 overflow-hidden md:h-[100dvh] md:min-h-0">
      <AppSidebar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* flex column so route children/loaders can use flex-1 and center vertically */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <BillingBanner state={billingState ?? null} />
          {pageInner}
        </div>
      </div>
    </div>
  );
}
