"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCardIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  Settings2Icon,
  UsersIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { easingOut } from "@/lib/motion-variants";

const MotionLink = motion.create(Link);

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const navOverview: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboardIcon },
  { href: "/employees", label: "Employees", Icon: UsersRoundIcon },
  { href: "/teams", label: "Organisation", Icon: UsersIcon },
  { href: "/billing", label: "Billing", Icon: CreditCardIcon },
  { href: "/usage", label: "Usage", Icon: GaugeIcon },
];

const navAccount: NavItem[] = [
  { href: "/profile", label: "Profile", Icon: UserRoundIcon },
  { href: "/settings", label: "Settings", Icon: Settings2Icon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({
  title,
  items,
  pathname,
  delayFrom,
  prefersReducedMotion,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  delayFrom: number;
  prefersReducedMotion: boolean;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground px-2.5 text-[11px] font-semibold tracking-wider uppercase opacity-85">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(({ href, label, Icon }, i) => {
          const active = isActive(pathname, href);
          return (
            <MotionLink
              href={href}
              key={href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm outline-none transition-[background,box-shadow,color] duration-200",
                "hover:bg-sidebar-accent/95 hover:text-sidebar-accent-foreground",
                active &&
                  "from-primary/22 to-primary/[0.06] bg-gradient-to-br text-sidebar-accent-foreground font-medium shadow-[0_12px_32px_-20px] shadow-primary/22",
                active &&
                  "before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:z-10 before:w-[3px] before:rounded-full before:bg-[color-mix(in_oklab,var(--primary)_92%,transparent)] before:opacity-95",
              )}
              initial={
                prefersReducedMotion ? false : { opacity: 0, x: -10 }
              }
              animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
              transition={{
                delay: prefersReducedMotion ? 0 : delayFrom + i * 0.04,
                duration: 0.32,
                ease: easingOut,
              }}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : { x: 2, transition: { duration: 0.2, ease: easingOut } }
              }
              whileTap={
                prefersReducedMotion ? undefined : { scale: 0.992 }
              }
            >
              <Icon className={cn("size-[1.125rem]", active && "opacity-95")} />
              {label}
            </MotionLink>
          );
        })}
      </div>
    </div>
  );
}

export function AppSidebar(): React.ReactElement {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion() === true;

  return (
    <aside className="bg-sidebar/94 supports-backdrop-filter:bg-sidebar/86 text-sidebar-foreground border-sidebar-border flex h-full min-h-0 w-[226px] shrink-0 flex-col border-r backdrop-blur-xl md:w-[252px]">
      <motion.div
        className="from-primary/[0.11] relative flex shrink-0 items-center gap-3 border-sidebar-border bg-gradient-to-br to-transparent px-4 py-[1.125rem]"
        initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easingOut }}
      >
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-md shadow-primary/15">
          <span className="font-heading text-xs font-bold tracking-tight">P</span>
        </div>
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="font-heading text-sidebar-foreground block truncate text-sm font-semibold tracking-tight"
          >
            Performa
          </Link>
          <p className="text-muted-foreground truncate text-[11px]">
            Workspace
          </p>
        </div>
      </motion.div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent opacity-85" />

      <nav aria-label="Main" className="flex flex-1 flex-col gap-5 overflow-y-auto p-3.5 pb-6">
        <NavGroup
          title="Overview"
          items={navOverview}
          pathname={pathname}
          delayFrom={0.02}
          prefersReducedMotion={prefersReducedMotion}
        />
        <NavGroup
          title="Account"
          items={navAccount}
          pathname={pathname}
          delayFrom={0.22}
          prefersReducedMotion={prefersReducedMotion}
        />
      </nav>

      <form action={signOut} className="border-sidebar-border border-t px-3.5 pt-3 pb-3.5">
        <motion.div
          {...(prefersReducedMotion ? {} : { whileTap: { scale: 0.99 } })}
        >
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="hover:bg-muted/85 text-muted-foreground hover:text-foreground hover:border-border/65 w-full justify-start gap-2 rounded-xl border border-transparent px-2.5 shadow-sm transition-colors duration-200"
          >
            <LogOutIcon className="size-4 opacity-80" aria-hidden />
            Sign out
          </Button>
        </motion.div>
      </form>
    </aside>
  );
}
