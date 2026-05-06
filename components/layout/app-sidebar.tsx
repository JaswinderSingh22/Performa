"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GitBranchIcon,
  LayoutGridIcon,
  ActivityIcon,
  LogOutIcon,
  ReceiptIndianRupeeIcon,
  Settings2Icon,
  Users2Icon,
  UserRoundIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { signOut } from "@/actions/auth";
import { HelpDialog } from "@/components/help/help-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { easingOut } from "@/lib/motion-variants";

const MotionLink = motion.create(Link);

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconWrapClass: string;
};

const navOverview: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    Icon: LayoutGridIcon,
    iconWrapClass: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
];

const navPeople: NavItem[] = [
  {
    href: "/employees",
    label: "Employees",
    Icon: Users2Icon,
    iconWrapClass: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  {
    href: "/teams",
    label: "Organisation",
    Icon: GitBranchIcon,
    iconWrapClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
];

const navAdmin: NavItem[] = [
  {
    href: "/billing",
    label: "Billing",
    Icon: ReceiptIndianRupeeIcon,
    iconWrapClass: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  {
    href: "/usage",
    label: "Usage",
    Icon: ActivityIcon,
    iconWrapClass: "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300",
  },
];

const navAccount: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    Icon: Settings2Icon,
    iconWrapClass: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  },
  {
    href: "/profile",
    label: "Profile",
    Icon: UserRoundIcon,
    iconWrapClass: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  },
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
  expanded,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  delayFrom: number;
  prefersReducedMotion: boolean;
  expanded: boolean;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      {expanded ? (
        <p className="text-muted-foreground px-2.5 text-[11px] font-semibold tracking-wider uppercase opacity-85">
          {title}
        </p>
      ) : null}
      <div className="flex flex-col gap-0.5">
        {items.map(({ href, label, Icon, iconWrapClass }, i) => {
          const active = isActive(pathname, href);
          return (
            <MotionLink
              href={href}
              key={href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm outline-none transition-[background,box-shadow,color] duration-200",
                "hover:bg-sidebar-accent/95 hover:text-sidebar-accent-foreground",
                active &&
                  "from-primary/22 to-primary/6 bg-linear-to-br text-sidebar-accent-foreground font-medium shadow-[0_12px_32px_-20px] shadow-primary/22",
                active &&
                  "before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:z-10 before:w-0.75 before:rounded-full before:bg-[color-mix(in_oklab,var(--primary)_92%,transparent)] before:opacity-95",
                !expanded && "justify-center px-2",
              )}
              title={!expanded ? label : undefined}
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
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl border border-border/55 shadow-sm",
                  "bg-background/60",
                  iconWrapClass,
                  active && "border-primary/25 bg-primary/6",
                )}
                aria-hidden
              >
                <Icon className={cn("size-4.5", active && "opacity-95")} />
              </span>
              {expanded ? label : null}
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
  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const [hovering, setHovering] = React.useState(false);
  const lastToggleAtRef = React.useRef<number>(0);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("sidebar_collapsed");
      if (raw === "1") setCollapsed(true);
      if (raw === "0") setCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  // When user clicks collapse while the cursor is inside the sidebar,
  // the hover-to-expand behavior would immediately re-expand it.
  // Add a small cooldown to make the collapse visible.
  const expanded = !collapsed || (hovering && Date.now() - lastToggleAtRef.current > 350);

  return (
    <aside
      className={cn(
        "bg-sidebar/94 supports-backdrop-filter:bg-sidebar/86 text-sidebar-foreground border-sidebar-border flex h-full min-h-0 shrink-0 flex-col border-r backdrop-blur-xl transition-[width] duration-200",
        expanded ? "w-56.5 md:w-63" : "w-16",
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.div
        className={cn(
          "from-primary/11 relative flex shrink-0 items-center border-sidebar-border bg-linear-to-br to-transparent px-2",
          expanded ? "py-2" : "py-2.5",
        )}
        initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easingOut }}
      >
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-1 py-1 transition-transform duration-200 hover:scale-[1.01]",
            !expanded && "mx-auto",
          )}
          aria-label="Go to dashboard"
          title="Dashboard"
        >
          <Image
            src="/brand/performaai-mark.png"
            alt="PerformaAi"
            width={30}
            height={30}
            className="size-7 object-contain"
          />
          {expanded ? (
            <span className="font-heading text-sidebar-foreground text-lg font-bold tracking-tight">
              PerformaAi
            </span>
          ) : null}
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("hover:bg-muted/70 ml-auto", !expanded && "ml-0 absolute -right-2 top-3")}
          onClick={() => {
            lastToggleAtRef.current = Date.now();
            setCollapsed((v) => {
              const next = !v;
              if (next) setHovering(false);
              return next;
            });
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="size-4" aria-hidden />
          ) : (
            <ChevronLeftIcon className="size-4" aria-hidden />
          )}
        </Button>
      </motion.div>

      <div className="mx-4 h-px bg-linear-to-r from-transparent via-sidebar-border to-transparent opacity-85" />

      <nav
        aria-label="Main"
        className={cn(
          "flex flex-1 flex-col gap-5 overflow-y-auto pb-6",
          expanded ? "p-3.5" : "px-2.5 pt-3.5",
        )}
      >
        <NavGroup
          title="Overview"
          items={navOverview}
          pathname={pathname}
          delayFrom={0.02}
          prefersReducedMotion={prefersReducedMotion}
          expanded={expanded}
        />
        <NavGroup
          title="People"
          items={navPeople}
          pathname={pathname}
          delayFrom={0.14}
          prefersReducedMotion={prefersReducedMotion}
          expanded={expanded}
        />
        <NavGroup
          title="Admin"
          items={navAdmin}
          pathname={pathname}
          delayFrom={0.22}
          prefersReducedMotion={prefersReducedMotion}
          expanded={expanded}
        />
        <NavGroup
          title="Account"
          items={navAccount}
          pathname={pathname}
          delayFrom={0.3}
          prefersReducedMotion={prefersReducedMotion}
          expanded={expanded}
        />
      </nav>

      <form
        action={signOut}
        className={cn(
          "border-sidebar-border border-t pt-3 pb-3.5 flex items-center",
          expanded ? "px-3.5" : "px-2.5",
        )}
      >
        <motion.div
          {...(prefersReducedMotion ? {} : { whileTap: { scale: 0.99 } })}
        >
          <div className={cn("mb-1.5", !expanded && "flex justify-center")}>
            <HelpDialog
              collapsed={!expanded}
              className={
                !expanded
                  ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary shadow-sm"
                  : "hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary w-full justify-start gap-2 rounded-xl border border-transparent px-2.5 shadow-sm transition-colors duration-200"
              }
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size={!expanded ? "icon-sm" : "sm"}
            className={cn(
              !expanded
                ? "mx-auto border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm"
                : "border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start gap-2 rounded-xl px-2.5 shadow-sm transition-colors duration-200",
            )}
            aria-label={!expanded ? "Sign out" : undefined}
            title={!expanded ? "Sign out" : undefined}
          >
            <LogOutIcon className="size-4 opacity-80" aria-hidden />
            {expanded ? "Sign out" : null}
          </Button>
        </motion.div>
      </form>
    </aside>
  );
}
