import Image from "next/image";
import Link from "next/link";

import { AmbientBackdrop } from "@/components/visual/ambient-backdrop";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-8 md:py-12">
      <AmbientBackdrop />
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden rounded-3xl border border-border/70 bg-card/70 p-7 shadow-sm backdrop-blur lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-1 py-1 transition-opacity hover:opacity-90"
          >
            <Image
              src="/brand/performaai-mark.png"
              alt="PerformaAI mark"
              width={64}
              height={64}
              className="h-10 w-10 rounded-full border border-border/50"
            />
            <span className="font-heading text-lg font-semibold tracking-tight">
              PerformaAI
            </span>
          </Link>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-3">
            <Image
              src="/brand/performaai-wordmark.png"
              alt="PerformaAI"
              width={1376}
              height={458}
              className="w-full rounded-xl"
              priority
            />
          </div>

          <div className="mt-6 space-y-3 text-sm">
            {[
              "Capture notes, achievements, and reviews in one flow.",
              "Generate roll-up summaries from period evidence.",
              "Track performance trends and usage in real time.",
            ].map((line) => (
              <p key={line} className="text-muted-foreground leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-opacity hover:opacity-90 lg:hidden"
          >
            <Image
              src="/brand/performaai-mark.png"
              alt="PerformaAI mark"
              width={40}
              height={40}
              className="h-8 w-8 rounded-full border border-border/50"
            />
            <span className="font-heading text-base font-semibold tracking-tight">
              PerformaAI
            </span>
          </Link>
          <p className="text-muted-foreground text-center text-xs">
            Sign in or create an account to open your workspace.
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
