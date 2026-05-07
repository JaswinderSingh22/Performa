"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  LayersIcon,
  LineChartIcon,
  MailIcon,
  MessageCircleIcon,
  RadarIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
  { href: "#pricing", label: "Pricing" },
  { href: "#help", label: "Help" },
] as const;

function supportEnv() {
  return {
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null,
    linkedin: process.env.NEXT_PUBLIC_SUPPORT_LINKEDIN_URL?.trim() || null,
  };
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  copy: string;
  align?: "center" | "left";
}): React.ReactElement {
  return (
    <div
      className={cn(
        align === "center" && "mx-auto max-w-2xl text-center",
        align === "left" && "max-w-xl",
      )}
    >
      {eyebrow ? (
        <Badge
          variant="outline"
          className="mb-3 border-primary/35 bg-primary/10 font-normal text-primary"
        >
          {eyebrow}
        </Badge>
      ) : null}
      <h2 className="font-heading text-balance text-2xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="text-muted-foreground mt-3 text-pretty text-sm leading-relaxed md:text-base">
        {copy}
      </p>
    </div>
  );
}

function CyclePreviewMock(): React.ReactElement {
  return (
    <div className="border-border/50 from-card/90 via-card/50 to-muted/15 relative overflow-hidden rounded-3xl border bg-gradient-to-br p-3 shadow-2xl ring-1 ring-primary/15">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-cyan-500/15 absolute -left-12 top-24 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-violet-600/15 absolute right-[-20%] bottom-[-10%] h-64 w-64 rounded-full blur-3xl" />
        <div className="via-primary/40 absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-70" />
      </div>

      <div className="bg-background/65 relative overflow-hidden rounded-2xl border border-white/10 shadow-inner backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300">
              <RadarIcon className="size-4" aria-hidden />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Review cycle</p>
              <p className="text-muted-foreground text-xs">Scoped teams · live invites</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-emerald-300/90">
              Open
            </span>
            <span className="rounded-full border border-white/10 px-2 py-1">Self-reviews</span>
            <span className="rounded-full border border-white/10 px-2 py-1">Manager pass</span>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2">
          <div className="border-border/60 rounded-xl border bg-black/20 p-3 ring-1 ring-inset ring-white/5">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Scope
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Engineering", "Design", "All org"].map((t) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs",
                    t === "All org"
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-white/10 bg-white/5",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              HR opens a cycle for the whole company or hand-picks teams—only those people get
              forms and reminders.
            </p>
          </div>

          {[
            {
              title: "Insights",
              line: "Notes + achievements roll into each period.",
              Icon: LineChartIcon,
            },
            {
              title: "AI assist",
              line: "Draft remarks grounded in real context.",
              Icon: SparklesIcon,
            },
            {
              title: "Pipeline",
              line: "Submit → manager → HR approval.",
              Icon: WorkflowIcon,
            },
            {
              title: "Seats",
              line: "Plans, import, and usage in one place.",
              Icon: UsersIcon,
            },
          ].map(({ title, line, Icon }) => (
            <div
              key={title}
              className="border-border/60 rounded-xl border bg-black/15 p-3 ring-1 ring-inset ring-white/5"
            >
              <div className="flex items-center gap-2">
                <Icon className="text-primary size-4 shrink-0" aria-hidden />
                <p className="text-sm font-semibold">{title}</p>
              </div>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{line}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-400/80 to-violet-500/80 shadow-[0_0_12px_rgba(34,211,238,0.35)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPage(): React.ReactElement {
  const reduced = useReducedMotion() === true;
  const { email: supportEmail, linkedin: supportLinkedin } = supportEnv();

  return (
    <main className="dark relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="bg-grid-soft absolute inset-0 opacity-[0.35]" />
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[min(80rem,100vw)] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/25 via-violet-600/12 to-transparent blur-3xl" />
        <div className="absolute top-[45%] right-[-10%] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-15%] h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <header className="border-border/40 bg-background/75 sticky top-0 z-40 border-b backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/performaai-mark.png"
              alt="PerformaAI"
              width={40}
              height={40}
              className="size-9 rounded-full border border-white/15 ring-1 ring-primary/20"
              priority
            />
            <span className="font-heading text-sm font-semibold tracking-tight md:text-base">
              PerformaAI
            </span>
          </Link>

          <nav className="text-muted-foreground hidden items-center gap-7 text-sm font-medium md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#help"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hidden sm:inline-flex",
              )}
            >
              Contact
            </a>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden md:inline-flex",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "sm" }),
                "gap-2 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/25",
              )}
            >
              Start free
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-16 pt-12 md:pt-20">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.5 }}
          className="grid gap-10 lg:grid-cols-2 lg:items-center"
        >
          <div>
            <Badge
              variant="outline"
              className="mb-4 border-cyan-500/30 bg-cyan-500/10 font-normal text-cyan-200/90"
            >
              <SparklesIcon className="mr-1.5 inline size-3.5" aria-hidden />
              AI-native review operations
            </Badge>
            <h1 className="font-heading text-balance text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
              Performance reviews built for{" "}
              <span className="bg-gradient-to-r from-cyan-200 via-primary to-violet-300 bg-clip-text text-transparent">
                how teams actually work.
              </span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-pretty text-base leading-relaxed md:text-lg">
              Launch review cycles scoped to the right teams, send secure self-review links, capture
              manager remarks, and approve the record—while AI helps draft grounded narratives from
              notes and achievements.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "gap-2 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-xl shadow-primary/30",
                )}
              >
                Start free
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Sign in
              </Link>
              <a
                href="#help"
                className={buttonVariants({ variant: "ghost", size: "lg", className: "gap-2" })}
              >
                <MessageCircleIcon className="size-4" />
                Help
              </a>
            </div>
            <div className="text-muted-foreground mt-8 flex flex-wrap gap-2 text-xs">
              {[
                "Team-scoped cycles",
                "Self-review tokens",
                "Manager + HR workflow",
                "AI remark assist",
                "CSV import (Pro)",
              ].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm"
                >
                  <CheckCircle2Icon className="text-cyan-400/90 size-3.5 shrink-0" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.08 }}
          >
            <CyclePreviewMock />
          </motion.div>
        </motion.div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduced ? 0 : 0.4 }}
          className="grid gap-10"
        >
          <SectionHeading
            eyebrow="Platform"
            title="Everything HR, managers, and ICs need in one flow."
            copy="From cycle design to final approval—PerformaAI keeps evidence, scoring, and AI assistance aligned so reviews feel fair and fast."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Scoped review cycles",
                copy: "Open a cycle for your whole organisation or selected teams—only matched employees enter the roster and receive invites.",
                Icon: LayersIcon,
              },
              {
                title: "Live self-reviews",
                copy: "Each person gets a private link to submit reflections; you track submissions and send reminders without spreadsheets.",
                Icon: SendIcon,
              },
              {
                title: "Manager layer",
                copy: "TLs and managers add structured remarks where it matters—then HR can approve before anything is finalized.",
                Icon: ShieldCheckIcon,
              },
              {
                title: "Employee insights",
                copy: "Scrollable timelines of notes and achievements feed period roll-ups with full context behind every score.",
                Icon: LineChartIcon,
              },
              {
                title: "AI co-pilot",
                copy: "Draft roll-ups and suggested remarks from real evidence—managers stay in control with edit and save.",
                Icon: BotIcon,
              },
              {
                title: "Import & scale",
                copy: "Org structure, teams, and bulk employee import on Pro/Pro+ so large rollouts stay orderly.",
                Icon: ClipboardListIcon,
              },
            ].map(({ title, copy, Icon }, idx) => (
              <motion.div
                key={title}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : idx * 0.05 }}
              >
                <Card className="border-border/50 h-full bg-card/40 shadow-lg ring-1 ring-white/5 backdrop-blur-md">
                  <CardHeader className="pb-2">
                    <div className="text-primary w-fit rounded-xl border border-primary/25 bg-primary/10 p-2 shadow-inner shadow-primary/10">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <CardTitle className="mt-2 text-base">{title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{copy}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="workflow" className="relative mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="border-border/50 absolute inset-x-6 -top-6 -z-10 h-48 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-violet-600/10 blur-2xl" />
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduced ? 0 : 0.4 }}
          className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
        >
          <div className="space-y-6">
            <SectionHeading
              align="left"
              eyebrow="How it flows"
              title="A clear pipeline from kickoff to sign-off."
              copy="Admins orchestrate cycles; managers focus on substance; contributors always know where they stand."
            />
            <ol className="space-y-4">
              {[
                {
                  step: "01",
                  title: "Create & scope",
                  body: "Name the period, set cadence, and choose workspace-wide coverage or specific teams.",
                },
                {
                  step: "02",
                  title: "Open & invite",
                   body: "HR opens the cycle to generate roster rows—then invite pending employees individually or all at once.",
                },
                {
                  step: "03",
                   title: "Self-review → manager pass",
                   body: "Individuals submit privately; TLs refine with remarks and structured ratings.",
                },
                {
                   step: "04",
                   title: "HR approval",
                   body: "Approve or revise the final narrative with confidence—all tied to immutable period context.",
                },
              ].map((row) => (
                <li
                  key={row.step}
                   className="border-border/50 flex gap-4 rounded-2xl border bg-card/30 p-4 ring-1 ring-white/5 backdrop-blur-md"
                >
                  <span className="text-primary font-heading text-xl font-semibold tracking-tight">
                     {row.step}
                  </span>
                  <div>
                    <p className="font-medium">{row.title}</p>
                     <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{row.body}</p>
                  </div>
                </li>
              ))}
             </ol>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.06 }}
            className="border-border/50 rounded-3xl border bg-gradient-to-br from-card/80 via-card/40 to-primary/10 p-5 shadow-2xl ring-1 ring-primary/20"
          >
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    AI workspace
                   </p>
                  <p className="font-heading mt-1 text-lg font-semibold">Grounded drafts</p>
                </div>
                <Badge variant="outline" className="border-cyan-500/35 font-normal text-cyan-300">
                   Live context
                </Badge>
               </div>
               <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { k: "Highlights", v: "Promotion-ready signals from milestones." },
                   { k: "Growth areas", v: "Suggested focus based on streaks." },
                   { k: "Score cues", v: "Dimension deltas across periods." },
                   { k: "Safety", v: "Nothing ships without manager + HR edits." },
                 ].map((row) => (
                   <div
                     key={row.k}
                     className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-inner"
                   >
                    <p className="text-xs font-semibold text-primary">{row.k}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{row.v}</p>
                  </div>
                ))}
               </div>
             </div>
          </motion.div>
        </motion.div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 pb-10">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: reduced ? 0 : 0.4 }}
          className="rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-primary/20 via-violet-600/15 to-background p-1 shadow-2xl shadow-primary/10"
        >
          <div className="rounded-[1.6rem] border border-white/10 bg-background/80 p-6 backdrop-blur-xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
               <div>
                <Badge variant="secondary" className="mb-3 font-normal">
                   Plans · Fair AI usage
                 </Badge>
                <h3 className="font-heading text-balance text-2xl font-semibold tracking-tight md:text-4xl">
                   Invest without gambling on shelf-ware.
                 </h3>
                <p className="text-muted-foreground mt-4 max-w-2xl text-pretty text-sm leading-relaxed md:text-base">
                   Start free, then unlock departments, richer team modelling, CSV import, and higher
                   seat counts on Pro/Pro+. Usage limits keep automation predictable for finance teams.
                 </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "gap-2 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-xl shadow-primary/25",
                     )}
                   >
                     Start free
                     <ArrowRightIcon className="size-4" />
                   </Link>
                  <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                     Sign in
                   </Link>
                 </div>
               </div>
              <Card className="border-border/50 bg-card/50 shadow-lg backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base">What you get</CardTitle>
                  <CardDescription>Highlights from the current product surface.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    "Scoped or org-wide performance cycles",
                     "Submission tracking + safeguarded deletes",
                     "AI-assisted drafts with human approval paths",
                     "Employee insights timelines & achievements",
                     "Seat governance + CSV import tiers",
                   ].map((line) => (
                     <div key={line} className="flex items-start gap-2">
                      <CheckCircle2Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                      <p className="text-muted-foreground text-sm leading-relaxed">{line}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <motion.figure
           initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
           transition={{ duration: reduced ? 0 : 0.35 }}
           className="border-border/50 mx-auto max-w-3xl rounded-[1.75rem] border bg-card/30 px-6 py-12 text-center shadow-xl ring-1 ring-white/10 backdrop-blur-xl md:px-10"
        >
          <SparklesIcon className="text-primary/80 mx-auto mb-6 size-8" aria-hidden />
          <blockquote className="font-heading text-balance text-xl font-semibold leading-relaxed md:text-2xl">
            “We finally replaced spreadsheet chaos with a single review command center. Scoped cycles
            mean each leader only sees their people—and AI keeps the narrative honest.”
          </blockquote>
          <figcaption className="text-muted-foreground mt-5 text-xs font-medium tracking-[0.24em]">
            VP PEOPLE · GLOBAL PRODUCT COMPANY
          </figcaption>
        </motion.figure>
      </section>

      <section id="help" className="mx-auto w-full max-w-6xl px-6 pb-24">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduced ? 0 : 0.4 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          <div className="border-border/50 rounded-3xl border bg-card/40 p-8 shadow-lg ring-1 ring-cyan-500/15 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                <MessageCircleIcon className="size-5" aria-hidden />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">Help</h3>
                <p className="text-muted-foreground text-sm">Guides and in-product support.</p>
              </div>
            </div>
            <ul className="text-muted-foreground mt-6 space-y-3 text-sm leading-relaxed">
              <li className="flex gap-2">
                <CheckCircle2Icon className="text-cyan-400 mt-0.5 size-4 shrink-0" aria-hidden />
                After you sign in, open <strong className="text-foreground">Help</strong> from the
                workspace sidebar to send us a message or question.
              </li>
              <li className="flex gap-2">
                <CheckCircle2Icon className="text-cyan-400 mt-0.5 size-4 shrink-0" aria-hidden />
                New to PerformaAI? Start with{" "}
                <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                  creating a workspace
                </Link>{" "}
                — onboarding walks through teams and employees.
              </li>
            </ul>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-6 gap-2")}
            >
              Go to app
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="border-border/50 rounded-3xl border bg-card/40 p-8 shadow-lg ring-1 ring-violet-500/15 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-200">
                <MailIcon className="size-5" aria-hidden />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">Contact</h3>
                <p className="text-muted-foreground text-sm">Talk with our team.</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-6 text-sm leading-relaxed">
              {supportEmail
                ? "Reach us directly—typical response within one business day."
                : "Set NEXT_PUBLIC_SUPPORT_EMAIL in your environment to surface a direct email button here. Until then, use Help inside the app after signing in."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {supportEmail ? (
                <a
                  href={`mailto:${supportEmail}`}
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "gap-2 bg-gradient-to-r from-violet-600 to-primary text-primary-foreground",
                  )}
                >
                  <MailIcon className="size-4" />
                  {supportEmail}
                </a>
              ) : null}
              {supportLinkedin ? (
                <a
                  href={supportLinkedin}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "default" })}
                >
                  LinkedIn
                </a>
              ) : null}
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-border/50 bg-background/90 border-t backdrop-blur-md">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/performaai-mark.png"
                alt="PerformaAI"
                width={40}
                height={40}
                className="size-9 rounded-full border border-white/15"
              />
              <span className="font-heading text-base font-semibold tracking-tight">
                PerformaAI
              </span>
            </div>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              Intelligent performance operations for teams that want evidence-first reviews without
              operational drag.
            </p>
          </div>

          {[
            {
              title: "Product",
              items: [
                { label: "Features", href: "#features" },
                { label: "Workflow", href: "#workflow" },
                { label: "Pricing", href: "#pricing" },
                { label: "Help", href: "#help" },
              ],
            },
            {
              title: "Get started",
              items: [
                { label: "Create account", href: "/signup" },
                { label: "Sign in", href: "/login" },
                { label: "Contact", href: "#help" },
              ],
            },
            {
              title: "Company",
              items: [
                { label: "PerformaAI", href: "/" },
                supportEmail
                  ? { label: "Email us", href: `mailto:${supportEmail}` }
                  : { label: "Email us", href: "#help" },
              ],
            },
          ].map((col) => (
            <div key={col.title} className="space-y-3 text-sm">
              <p className="text-foreground font-semibold">{col.title}</p>
              <ul className="text-muted-foreground space-y-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-foreground transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-border/50 text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t px-6 py-5 text-xs">
          <p>© {new Date().getFullYear()} PerformaAI. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="cursor-not-allowed opacity-60">Terms</span>
            <span className="cursor-not-allowed opacity-60">Privacy</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
