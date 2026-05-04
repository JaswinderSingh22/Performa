"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { signUpWithEmail } from "@/actions/auth";
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

export function SignupForm() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion() === true;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      fullName: String(fd.get("fullName") ?? "").trim(),
    };

    startTransition(async () => {
      const result = await signUpWithEmail(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.pendingEmailVerification) {
        setInfo(
          "Check your inbox to confirm your email before continuing. Once confirmed, sign in.",
        );
        return;
      }
      router.replace("/onboarding");
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
            Create account
          </CardTitle>
          <CardDescription className="text-pretty">
            Use Google once on this screen, or create an account with email and password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <GoogleOAuthButton
                label="Sign up with Google"
                disabled={pending}
              />
              <div className="flex items-center gap-3">
                <Separator className="shrink" />
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Or email
                </span>
                <Separator className="shrink" />
              </div>
            </div>
            <motion.div {...fieldContainerProps}>
              {info ? (
                <motion.div
                  variants={prefersReducedMotion ? undefined : staggerFieldItem}
                  className="space-y-2"
                >
                  <p className="bg-muted/50 border-primary/10 rounded-xl border px-3 py-2.5 text-sm leading-relaxed">
                    {info}
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
                <Label htmlFor="signup-full">Full name</Label>
                <Input
                  id="signup-full"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className="focus-visible:ring-primary/25 rounded-xl transition-shadow duration-200"
                />
              </motion.div>
              <motion.div
                variants={prefersReducedMotion ? undefined : staggerFieldItem}
                className="space-y-2"
              >
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
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
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="focus-visible:ring-primary/25 rounded-xl transition-shadow duration-200"
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  At least 8 characters.
                </p>
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
                Sign up
              </Button>
            </motion.div>
            <p className="text-muted-foreground text-center text-sm sm:text-right">
              Already joined?{" "}
              <Link
                href="/login"
                className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
