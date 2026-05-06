"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  LineChartIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { id: string; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "solutions", label: "Solutions" },
  { id: "pricing", label: "Pricing" },
  { id: "resources", label: "Resources" },
];

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow?: string;
  title: string;
  copy: string;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <Badge variant="secondary" className="mb-3 font-normal">
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

function AppPreview(): React.ReactElement {
  return (
    <div className="border-border/70 from-card/98 to-muted/20 relative overflow-hidden rounded-3xl border bg-gradient-to-br p-3 shadow-xl">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-primary/8 absolute -left-10 -top-10 h-40 w-40 rounded-full blur-2xl" />
        <div className="bg-violet-500/10 absolute right-0 top-24 h-48 w-48 rounded-full blur-2xl" />
      </div>
      <div className="bg-background/70 relative overflow-hidden rounded-2xl border border-border/60">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/12 text-primary size-8 rounded-lg grid place-items-center border border-primary/15">
              <LineChartIcon className="size-4" aria-hidden />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Employee insights</p>
              <p className="text-muted-foreground text-xs">Evidence → roll-up → score</p>
            </div>
          </div>
          <div className="text-muted-foreground hidden items-center gap-2 text-xs md:flex">
            <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1">
              Monthly → Yearly
            </span>
            <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1">
              Live reminders
            </span>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {[
            { title: "Context", line: "Notes + achievements stitched per period." },
            { title: "Roll-ups", line: "AI drafts grounded in real evidence." },
            { title: "Scoring", line: "Dimensions keep performance fair." },
            { title: "Usage", line: "Seats + import respect your plan." },
          ].map((c) => (
            <div
              key={c.title}
              className="border-border/70 bg-card/60 rounded-xl border p-3 shadow-sm"
            >
              <p className="text-sm font-semibold">{c.title}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {c.line}
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-muted/50">
                <div className="h-2 w-[62%] rounded-full bg-gradient-to-r from-primary/60 to-violet-500/60" />
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

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/10 absolute -top-28 left-1/2 h-[34rem] w-[58rem] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="bg-violet-500/10 absolute right-0 top-56 h-72 w-72 rounded-full blur-3xl" />
      </div>

      <div className="border-border/60 bg-background/70 sticky top-0 z-40 border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/performaai-mark.png"
              alt="PerformaAI"
              width={40}
              height={40}
              className="size-9 rounded-full border border-border/60"
              priority
            />
            <span className="font-heading text-sm font-semibold tracking-tight md:text-base">
              PerformaAI
            </span>
          </Link>

          {/* <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav> */}

          <div className="flex items-center gap-2">
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
              className={cn(buttonVariants({ size: "sm" }), "gap-2")}
            >
              Start free
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-12 pt-10 md:pt-16">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="grid gap-8 lg:grid-cols-2 lg:items-center"
        >
          <div>
            <Badge variant="secondary" className="mb-3 font-normal">
              AI-powered performance
            </Badge>
            <h1 className="font-heading text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Run modern performance reviews without spreadsheet chaos.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-pretty text-base leading-relaxed md:text-lg">
              Organise departments and teams, capture evidence in real-time, and generate
              AI roll-ups that are grounded in context — with consistent scoring and
              clean HR workflows.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                Start free
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Sign in
              </Link>
            </div>
            <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5">
                <CheckCircle2Icon className="text-primary size-3.5" aria-hidden />
                Department cadence
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5">
                <CheckCircle2Icon className="text-primary size-3.5" aria-hidden />
                AI roll-ups + scoring
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5">
                <CheckCircle2Icon className="text-primary size-3.5" aria-hidden />
                CSV import (Pro)
              </span>
            </div>
          </div>
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: reduced ? 0 : 0.45,
              delay: reduced ? 0 : 0.1,
            }}
          >
            <AppPreview />
          </motion.div>
        </motion.div>

        {/* <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="border-border/70 bg-card/50 rounded-2xl border px-5 py-4"
        >
          <p className="text-muted-foreground text-center text-xs font-medium tracking-[0.22em]">
            TRUSTED BY FORWARD-THINKING HR TEAMS
          </p>
          <div className="text-muted-foreground mt-4 grid grid-cols-2 gap-3 text-center text-sm font-semibold md:grid-cols-5">
            {["Gusto", "Loom", "Figma", "Notion", "Slack"].map((name) => (
              <div
                key={name}
                className="bg-muted/25 rounded-xl border border-border/60 py-2"
              >
                {name}
              </div>
            ))}
          </div>
        </motion.div> */}
      </section>

      <section id="product" className="mx-auto w-full max-w-6xl px-6 pb-14">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="grid gap-8"
        >
          <SectionHeading
            title="Designed for people, powered by intelligence."
            copy="Stop wasting hours on administrative overhead. PerformaAI centralizes context so you can focus on coaching."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Capture Context",
                copy: "Real-time notes and achievements captured as they happen, so no milestone is lost.",
                Icon: ClipboardListIcon,
              },
              {
                title: "AI Narratives",
                copy: "Auto-generated roll-ups that synthesize feedback into clear, actionable narratives.",
                Icon: BotIcon,
              },
              {
                title: "Fair Scoring",
                copy: "Structured scoring frameworks with consistent records to reduce recency bias.",
                Icon: ShieldCheckIcon,
              },
            ].map(({ title, copy, Icon }, idx) => (
              <motion.div
                key={title}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: reduced ? 0 : 0.28,
                  delay: reduced ? 0 : idx * 0.06,
                }}
              >
                <Card className="border-border/70 h-full bg-card/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="bg-primary/10 text-primary w-fit rounded-xl border border-primary/15 p-2">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <CardTitle className="mt-2 text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm leading-relaxed">
                    {copy}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="solutions" className="mx-auto w-full max-w-6xl px-6 pb-14">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center"
        >
          <div>
            <SectionHeading
              eyebrow="Meet your AI Performance Agent"
              title="Roll-ups that start from evidence, not opinions."
              copy="PerformaAI scans the context you’ve captured—notes, achievements, and prior reviews—to draft roll-ups that managers can refine quickly."
            />
            <div className="mt-6 space-y-3">
              {[
                "Eliminates the blank page problem for managers",
                "Keeps cadence-based review periods consistent",
                "Saves hours per cycle without losing context",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <CheckCircle2Icon
                    className="text-primary mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.05 }}
            className="border-border/70 from-card/98 to-muted/20 rounded-3xl border bg-gradient-to-br p-4 shadow-lg"
          >
            <div className="bg-background/70 rounded-2xl border border-border/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">AI roll-up overview</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Example: last quarter
                  </p>
                </div>
                <Badge variant="outline" className="font-normal">
                  Draft → Save
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  { k: "Highlights", v: "Promotion-ready impact, clear ownership." },
                  { k: "Growth", v: "Next steps grounded in evidence." },
                  { k: "Score", v: "Dimension averages trend over time." },
                  { k: "Reminders", v: "Pending periods shown clearly." },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="border-border/70 bg-card/50 rounded-xl border p-3"
                  >
                    <p className="text-xs font-semibold">{row.k}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {row.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 pb-10">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/[0.10] via-violet-500/[0.08] to-emerald-500/[0.06] p-6 shadow-lg md:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h3 className="font-heading text-balance text-2xl font-semibold tracking-tight md:text-4xl">
                Invest in your people.
              </h3>
              <p className="text-muted-foreground mt-3 max-w-2xl text-pretty text-sm leading-relaxed md:text-base">
                Start free, then upgrade to Pro/Pro+ for departments, teams, and bulk CSV import. Fair usage applies to AI roll-ups.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className={cn(buttonVariants({ size: "lg" }), "gap-2")}
                >
                  Start free
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Sign in
                </Link>
              </div>
            </div>
            <div className="border-border/70 bg-card/60 rounded-2xl border p-4">
              <p className="text-sm font-semibold">What you get</p>
              <div className="mt-3 space-y-2">
                {[
                  "Employee insights with scrollable context",
                  "AI-assisted roll-ups (draft → save)",
                  "Seat limits with active/locked controls",
                  "CSV import (Pro/Pro+)",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2">
                    <CheckCircle2Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {line}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="resources" className="mx-auto w-full max-w-6xl px-6 pb-16">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="border-border/70 bg-card/60 rounded-3xl border px-6 py-10 shadow-md"
        >
          <figure className="mx-auto max-w-3xl text-center">
            <div className="bg-muted/35 mx-auto mb-4 size-14 rounded-full border border-border/60" />
            <blockquote className="font-heading text-balance text-xl font-semibold leading-relaxed md:text-2xl">
              “Switching from spreadsheets to PerformaAI was the best decision our HR team
              made this year. The roll-ups give managers a superpower—deep feedback in a
              fraction of the time.”
            </blockquote>
            <figcaption className="text-muted-foreground mt-4 text-xs tracking-[0.24em]">
              DIRECTOR OF PEOPLE OPS · FORWARD-THINKING TEAM
            </figcaption>
          </figure>
        </motion.div>
      </section>

      <footer className="border-border/60 bg-background/60 border-t">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/performaai-mark.png"
                alt="PerformaAI"
                width={40}
                height={40}
                className="size-9 rounded-full border border-border/60"
              />
              <span className="font-heading text-base font-semibold tracking-tight">
                PerformaAI
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Intelligent performance management for human-centric organisations.
            </p>
          </div>

          {[
            {
              title: "Product",
              items: ["Features", "AI roll-ups", "Insights", "Security"],
            },
            {
              title: "Solutions",
              items: ["Startups", "Scale-ups", "Remote teams", "Enterprise"],
            },
            {
              title: "Company",
              items: ["About", "Careers", "Contact", "Privacy"],
            },
          ].map((col) => (
            <div key={col.title} className="space-y-3 text-sm">
              <p className="text-foreground font-semibold">{col.title}</p>
              <ul className="text-muted-foreground space-y-2">
                {col.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-border/60 text-muted-foreground mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-t px-6 py-5 text-xs">
          <p>© {new Date().getFullYear()} PerformaAI. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
