import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircle2Icon, SparklesIcon } from "lucide-react";

import { AmbientBackdrop } from "@/components/visual/ambient-backdrop";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VALUE_LINES = [
  "Team-scoped review cycles with secure self-review links.",
  "Notes, achievements, and AI-assisted roll-ups in one workspace.",
  "Manager remarks, HR approval, and usage-aware plans.",
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background text-foreground">
      <AmbientBackdrop />

      <header className="border-border/70 bg-background/80 relative z-20 flex shrink-0 items-center justify-between border-b px-6 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-2 text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition-opacity hover:opacity-90"
        >
          <Image
            src="/brand/performaai-mark.png"
            alt="PerformaAI"
            width={36}
            height={36}
            className="size-9 rounded-full border border-border/60 shadow-sm ring-1 ring-black/[0.04]"
            priority
          />
          <span className="font-heading text-sm font-semibold tracking-tight md:text-base">
            PerformaAI
          </span>
        </Link>
        <span className="w-[4.5rem] sm:w-24" aria-hidden />
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 md:py-14">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
          <div className="hidden lg:block">
            <div className="border-border/70 relative overflow-hidden rounded-[1.75rem] border bg-card p-8 shadow-md ring-1 ring-black/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-card/95">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_-10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%)]"
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-primary">
                  <SparklesIcon className="size-4" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Workspace access
                  </span>
                </div>
                <h1 className="font-heading mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                  AI-native performance,{" "}
                  <span className="bg-gradient-to-r from-primary via-violet-600 to-teal-600 bg-clip-text text-transparent">
                    built for teams.
                  </span>
                </h1>
                <p className="text-muted-foreground mt-3 max-w-md text-pretty text-sm leading-relaxed">
                  Sign in to run scoped review cycles, collect evidence, and keep manager plus HR
                  workflows in sync—the same calm layout you&apos;ll use inside the app.
                </p>

                <div className="border-border/70 mt-8 flex items-center gap-5 rounded-2xl border bg-muted/40 p-6 ring-1 ring-black/[0.03]">
                  <Image
                    src="/brand/performaai-mark.png"
                    alt=""
                    width={96}
                    height={96}
                    className="size-16 shrink-0 rounded-2xl border border-border/70 shadow-sm ring-1 ring-black/[0.04] md:size-20"
                    priority={false}
                  />
                  <div className="min-w-0">
                    <p className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                      <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                        PerformaAI
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-pretty text-sm leading-relaxed">
                      AI-powered performance. Real human impact.
                    </p>
                  </div>
                </div>

                <ul className="mt-8 space-y-3 text-sm">
                  {VALUE_LINES.map((line) => (
                    <li key={line} className="flex gap-2.5 leading-relaxed">
                      <CheckCircle2Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-5">
            <p className="text-muted-foreground px-2 text-center text-xs leading-relaxed">
              Sign in or create an account to open your workspace.
            </p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
