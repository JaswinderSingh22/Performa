"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";

import { AmbientBackdrop } from "@/components/visual/ambient-backdrop";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { Button } from "@/components/ui/button";
import { easingOut } from "@/lib/motion-variants";

const rise = (delay: number, reduce: boolean | null) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.42, ease: easingOut, delay },
      };

export function HomeHero() {
  const reduce = useReducedMotion();
  const pulse = reduce
    ? {}
    : {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: { type: "spring" as const, stiffness: 460, damping: 26 },
      };

  return (
    <div className="relative isolate flex min-h-[min(100dvh,920px)] flex-col overflow-hidden">
      <AmbientBackdrop />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pt-28 pb-24 sm:pt-36">
        <div className="flex flex-1 flex-col justify-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="flex max-w-2xl flex-col gap-8">
            <motion.div
              {...rise(0, reduce)}
              className="border-primary/20 bg-background/70 text-primary inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-xs font-medium shadow-sm backdrop-blur-md"
            >
              <SparklesIcon className="size-3.5 shrink-0" aria-hidden />
              Performance reviews that centre people
            </motion.div>

            <motion.h1
              {...rise(0.06, reduce)}
              className="font-heading text-foreground text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]"
            >
              Coach your team{" "}
              <span className="from-primary bg-gradient-to-r via-[oklch(0.55_0.2_286)] to-[oklch(0.62_0.14_200)] bg-clip-text text-transparent">
                with consistent context
              </span>
            </motion.h1>

            <motion.p
              {...rise(0.12, reduce)}
              className="text-muted-foreground max-w-lg text-lg leading-relaxed text-pretty sm:text-xl"
            >
              Capture wins, notes, and achievements in one workspace so reviews
              are grounded in facts—not memory.
            </motion.p>

            <motion.div
              {...rise(0.18, reduce)}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <motion.div
                {...pulse}
                className="min-w-[min(100%,220px)] sm:min-w-0"
              >
                <GoogleOAuthButton
                  label="Sign up with Google"
                  fullWidth={false}
                  className="h-10 shrink-0 justify-center px-7 text-[0.9375rem] md:h-[2.375rem]"
                />
              </motion.div>
              <motion.div {...pulse}>
                <Button
                  className="rounded-xl px-7 shadow-md"
                  render={<Link href="/signup" />}
                  nativeButton={false}
                  size="lg"
                >
                  Get started free
                  <ArrowRightIcon className="size-4" aria-hidden />
                </Button>
              </motion.div>
              <motion.div {...pulse}>
                <Button
                  variant="outline"
                  className="border-primary/20 bg-background/60 rounded-xl px-6 backdrop-blur-sm"
                  render={<Link href="/login" />}
                  nativeButton={false}
                  size="lg"
                >
                  Sign in
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            {...rise(0.22, reduce)}
            className="border-border/80 bg-card/85 ring-primary/10 relative w-full max-w-md rounded-3xl border p-6 shadow-xl ring-1 backdrop-blur-md lg:max-w-sm"
          >
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              What&apos;s included
            </p>
            <ul className="mt-5 space-y-4 text-sm">
              {[
                "Organization-wide employee directories and timelines",
                "Achievements linked to individuals for review season",
                "Private manager notes beside each profile",
              ].map((line, i) => (
                <motion.li
                  key={line}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={reduce ? false : { opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.35 + i * 0.08,
                    duration: 0.35,
                    ease: easingOut,
                  }}
                  className="border-border bg-background/50 flex gap-3 rounded-xl border px-3 py-2.5"
                >
                  <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <span className="text-foreground/90 leading-snug">
                    {line}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
