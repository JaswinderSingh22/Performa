"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { signInWithEmail } from "@/actions/auth";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  easingOut,
  staggerFieldItem,
  staggerFieldParent,
} from "@/lib/motion-variants";

export function LoginForm() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion() === true;
  const params = useSearchParams();
  const rawNext = params.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";
  const notice = params.get("message");

  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    startTransition(async () => {
      const result = await signInWithEmail({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  };

  const cardMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14, scale: 0.99 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.4, ease: easingOut },
      };

  const fieldContainerProps = prefersReducedMotion
    ? { className: "space-y-4" }
    : {
        className: "space-y-4",
        variants: staggerFieldParent,
        initial: "hidden" as const,
        animate: "visible" as const,
      };

  return (
    <motion.div {...cardMotion} className="w-full max-w-md">
      <Card className="border-border/60 bg-card/90 ring-primary/[0.06] supports-[backdrop-filter]:bg-card/80 w-full rounded-2xl shadow-xl ring-1 shadow-black/[0.04] backdrop-blur-xl dark:shadow-black/30">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Sign in
          </CardTitle>
          <CardDescription className="text-pretty">
            Sign in with Google or your workspace email and password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <GoogleOAuthButton redirectNext={next} disabled={pending} />
              <div className="flex items-center gap-3">
                <Separator className="shrink" />
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Or email
                </span>
                <Separator className="shrink" />
              </div>
            </div>
            <motion.div {...fieldContainerProps}>
              {notice ? (
                <motion.div
                  variants={prefersReducedMotion ? undefined : staggerFieldItem}
                  className="space-y-2"
                >
                  <p className="bg-muted/50 border-primary/10 rounded-xl border px-3 py-2.5 text-sm leading-relaxed">
                    {notice}
                  </p>
                </motion.div>
              ) : null}
              {error ? (
                <motion.div
                  variants={prefersReducedMotion ? undefined : staggerFieldItem}
                  className="space-y-2"
                >
                  <p className="text-destructive text-sm" role="alert">
                    {error}
                  </p>
                </motion.div>
              ) : null}
              <motion.div
                variants={prefersReducedMotion ? undefined : staggerFieldItem}
                className="space-y-2"
              >
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="focus-visible:ring-primary/25 rounded-xl transition-shadow duration-200"
                />
              </motion.div>
              <motion.div
                variants={prefersReducedMotion ? undefined : staggerFieldItem}
                className="space-y-2"
              >
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="focus-visible:ring-primary/25 rounded-xl transition-shadow duration-200"
                />
              </motion.div>
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <motion.div
              className="w-full sm:w-auto"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={pending}
                className="w-full gap-2 rounded-xl shadow-sm sm:w-auto"
              >
                {pending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Continue
              </Button>
            </motion.div>
            <p className="text-muted-foreground text-center text-sm sm:text-right">
              New here?{" "}
              <Link
                href="/signup"
                className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
              >
                Create account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
