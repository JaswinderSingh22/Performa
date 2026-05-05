"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { EmployeeProfileActions } from "@/components/employees/employee-profile-actions";
import { AchievementsPanel } from "@/components/employees/achievements-panel";
import { EmployeeNotesPanel } from "@/components/employees/employee-notes-panel";
import { ReviewsPanel } from "@/components/employees/reviews-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import type {
  AchievementRow,
  EmployeeNoteRow,
  EmployeeRow,
  ReviewWithDimensions,
} from "@/types/database";
import { easingOut } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";

export type ProfileTab = "achievements" | "notes" | "reviews";

function parseTab(raw: string | undefined): ProfileTab {
  if (raw === "notes" || raw === "reviews" || raw === "achievements") {
    return raw;
  }
  return "achievements";
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function EmployeeProfileTabs({
  employee,
  achievements,
  notes,
  reviews,
  teams,
  departments,
  initialTab,
}: {
  employee: EmployeeRow;
  achievements: AchievementRow[];
  notes: EmployeeNoteRow[];
  reviews: ReviewWithDimensions[];
  teams: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  initialTab?: string;
}): ReactElement {
  const prefersReducedMotion = useReducedMotion() === true;
  const defaultTab = parseTab(initialTab);

  const panelMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.32, ease: easingOut },
      };

  return (
    <div className="relative flex-1 overflow-x-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/5 absolute -top-28 right-0 h-72 w-[28rem] rounded-full blur-3xl" />
        <div className="bg-violet-500/8 absolute top-40 -left-24 h-56 w-56 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="space-y-8 p-6 pb-12"
        {...(prefersReducedMotion
          ? {}
          : {
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.38, ease: easingOut },
            })}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <Link
            href="/employees"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground -ml-2 h-auto self-start px-2 py-0",
            )}
          >
            ← Employees
          </Link>
        </div>

        <Card className="border-border/70 from-card/95 to-muted/15 relative overflow-hidden bg-gradient-to-br p-5 shadow-lg md:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="bg-primary/15 text-primary border-primary/10 flex size-14 shrink-0 items-center justify-center rounded-2xl border text-lg font-semibold tracking-tight tabular-nums shadow-inner">
                {initials(employee.name)}
              </div>
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                  {employee.name}
                </h1>
                <p className="text-muted-foreground mt-1 truncate text-sm md:text-base">
                  {employee.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {employee.role ? (
                    <Badge variant="secondary" className="font-normal">
                      {employee.role}
                    </Badge>
                  ) : null}
                  {employee.department ? (
                    <Badge variant="outline" className="font-normal">
                      {employee.department}
                    </Badge>
                  ) : null}
                  {employee.team_name?.trim() ? (
                    <Badge className="border-primary/14 bg-primary/8 text-primary font-normal">
                      Team · {employee.team_name}
                    </Badge>
                  ) : null}
                  {employee.join_date ? (
                    <span className="text-muted-foreground text-xs tabular-nums self-center">
                      Joined {employee.join_date}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
        <div className="flex w-full shrink-0 flex-wrap gap-2 md:w-auto md:justify-end md:gap-3">
              <Link
                href={`/employees/${employee.id}/insights`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-lg shadow-sm no-underline",
                )}
              >
                Insights
              </Link>
              <Link
                href={`/employees/${employee.id}/generate-review`}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "rounded-lg shadow-sm no-underline",
                )}
                title="Combine notes, achievements, and prior reviews for a period"
              >
                Roll-up review
              </Link>
              <EmployeeProfileActions
                employee={employee}
                teams={teams}
                departments={departments}
              />
            </div>
          </div>
        </Card>

        <Card className="border-border/65 overflow-hidden shadow-md">
          <Tabs
            defaultValue={defaultTab}
            orientation="horizontal"
            className="gap-0"
          >
            <div className="bg-muted/35 border-border/60 border-b px-3 py-2 md:px-4">
              <TabsList className="bg-background/70 h-9 w-full justify-start gap-0.5 rounded-xl p-1 shadow-sm md:w-auto">
                <TabsTrigger
                  value="achievements"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4"
                >
                  Achievements
                  <span className="text-muted-foreground ml-1.5 hidden text-xs tabular-nums sm:inline">
                    ({achievements.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4"
                >
                  Notes
                  <span className="text-muted-foreground ml-1.5 hidden text-xs tabular-nums sm:inline">
                    ({notes.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4"
                >
                  Reviews
                  <span className="text-muted-foreground ml-1.5 hidden text-xs tabular-nums sm:inline">
                    ({reviews.length})
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 md:p-6">
              <TabsContent value="achievements" keepMounted={false}>
                <motion.div {...panelMotion}>
                  <AchievementsPanel
                    key={employee.id}
                    employeeId={employee.id}
                    achievements={achievements}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="notes" keepMounted={false}>
                <motion.div {...panelMotion}>
                  <EmployeeNotesPanel
                    key={employee.id}
                    employeeId={employee.id}
                    notes={notes}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="reviews" keepMounted={false}>
                <motion.div {...panelMotion}>
                  <ReviewsPanel
                    key={employee.id}
                    employeeId={employee.id}
                    reviews={reviews}
                  />
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
}
