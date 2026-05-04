import Link from "next/link";

import { AmbientBackdrop } from "@/components/visual/ambient-backdrop";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      <AmbientBackdrop />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <Link
          href="/"
          className="font-heading text-foreground/90 hover:text-foreground text-lg font-semibold tracking-tight transition-colors"
        >
          Performa
        </Link>
        <p className="text-muted-foreground text-center text-xs">
          Sign in or create an account to open your workspace.
        </p>
        {children}
      </div>
    </div>
  );
}
