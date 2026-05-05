"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRightIcon,
  BotIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  GaugeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "Organisation-first setup",
    copy: "Create departments, teams, and roles so reviews map to real reporting lines.",
    Icon: Building2Icon,
  },
  {
    title: "Evidence-first insights",
    copy: "Capture notes, achievements, and reviews in one employee journey with scrollable context.",
    Icon: ClipboardListIcon,
  },
  {
    title: "AI-assisted roll-ups",
    copy: "Generate period summaries from available evidence and keep momentum across review cycles.",
    Icon: SparklesIcon,
  },
  {
    title: "Usage and billing visibility",
    copy: "Track workspace capacity, plan usage, and growth signals from one clean dashboard.",
    Icon: GaugeIcon,
  },
  {
    title: "Department cadence control",
    copy: "Configure monthly, quarterly, mid-year, or yearly review cycles by department.",
    Icon: CalendarClockIcon,
  },
  {
    title: "Structured and fair scoring",
    copy: "Use checklist and dimension scoring with consistent records across all employees.",
    Icon: ShieldCheckIcon,
  },
];

export function LandingPage(): React.ReactElement {
  const reduced = useReducedMotion() === true;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/10 absolute -top-24 left-1/2 h-[32rem] w-[54rem] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="bg-violet-500/10 absolute right-0 top-48 h-72 w-72 rounded-full blur-3xl" />
      </div>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-10 pt-12 md:pt-20">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="grid gap-8 lg:grid-cols-2 lg:items-center"
        >
          <div>
            <Badge variant="secondary" className="mb-3 font-normal">
              PerformaAI · AI-Powered Performance. Real Human Impact.
            </Badge>
            <h1 className="font-heading text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Run modern performance reviews without spreadsheet chaos.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-pretty text-base leading-relaxed md:text-lg">
              Build your organisation structure, capture employee evidence continuously,
              and generate review roll-ups with AI support and reliable scoring.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                Start free
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Sign in
              </Link>
            </div>
          </div>
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0 : 0.45, delay: reduced ? 0 : 0.1 }}
            className="border-border/70 from-card to-muted/20 rounded-3xl border bg-gradient-to-br p-3 shadow-lg"
          >
            <Image
              src="/brand/performaai-wordmark.png"
              alt="PerformaAI name and tagline"
              width={1376}
              height={458}
              className="w-full rounded-2xl border border-border/60"
              priority
            />
          </motion.div>
        </motion.div>

        {/* <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.15 }}
          className="mx-auto w-full max-w-xs"
        >
          <Image
            src="/brand/performaai-mark.png"
            alt="PerformaAI mark"
            width={746}
            height={756}
            className="mx-auto w-36 rounded-full border border-border/50 shadow-md"
          />
        </motion.div> */}

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.1 }}
          className="grid gap-4 md:grid-cols-3"
        >
          <Card className="border-border/70 from-card to-primary/[0.03] bg-gradient-to-br">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">100+</p>
              <p className="text-muted-foreground text-xs">Scale from startup to enterprise teams</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 from-card to-violet-500/[0.04] bg-gradient-to-br">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">AI roll-up support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">Monthly → Yearly</p>
              <p className="text-muted-foreground text-xs">Generate cadence-based narratives from context</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 from-card to-emerald-500/[0.04] bg-gradient-to-br">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actionable insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">Live</p>
              <p className="text-muted-foreground text-xs">
                Dashboard trends, reminders, and performance signals
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {[
            {
              title: "1. Organise your workspace",
              copy: "Create departments and teams, then assign employee ownership with role controls.",
              Icon: Building2Icon,
            },
            {
              title: "2. Capture performance evidence",
              copy: "Log notes and achievements continuously, not just during appraisal month.",
              Icon: ClipboardListIcon,
            },
            {
              title: "3. Generate and review roll-ups",
              copy: "Use AI-generated drafts and HR review flows to finalize context-rich outcomes.",
              Icon: BotIcon,
            },
          ].map(({ title, copy, Icon }) => (
            <Card key={title} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="text-primary size-4" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm leading-relaxed">
                {copy}
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, copy, Icon }, idx) => (
            <motion.div
              key={title}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : idx * 0.05 }}
            >
              <Card className="border-border/70 h-full transition-colors hover:border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="bg-primary/10 text-primary rounded-lg p-1.5">
                      <Icon className="size-4" />
                    </span>
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{copy}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <Card className="border-border/70 from-card to-muted/20 bg-gradient-to-br">
          <CardContent className="grid gap-6 p-6 md:grid-cols-3">
            {[
              "Capture context via notes, achievements, and reviews in one employee profile.",
              "Generate roll-up narratives for selected monthly, quarterly, mid-year, or yearly windows.",
              "Track usage, coverage, and trend signals with role-aware dashboards.",
            ].map((line) => (
              <div key={line} className="flex items-start gap-2">
                <CheckCircle2Icon className="text-primary mt-0.5 size-4 shrink-0" />
                <p className="text-sm leading-relaxed">{line}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card px-5 py-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="text-primary size-4" />
            <p className="text-sm">Built for HR, People Ops, and team leads.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
              Sign in
            </Button>
            <Button render={<Link href="/signup" />} nativeButton={false}>
              Create workspace
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
