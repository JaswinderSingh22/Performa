import Link from "next/link";

import { AmbientBackdrop } from "@/components/visual/ambient-backdrop";

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden p-6">
      <AmbientBackdrop />
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-4">
        <Link
          href="/"
          className="font-heading text-foreground/90 hover:text-foreground text-lg font-semibold tracking-tight transition-colors"
        >
          Performa
        </Link>
        <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
          Name your organisation first—this becomes your Performa workspace. You&apos;ll
          be the owner and an Admin so you can set up teams and employees next.
        </p>
        {children}
      </div>
    </div>
  );
}
