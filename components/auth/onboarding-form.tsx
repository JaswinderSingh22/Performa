"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { completeOnboarding } from "@/actions/onboarding";
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
import {
  easingOut,
  staggerFieldItem,
  staggerFieldParent,
} from "@/lib/motion-variants";

export function OnboardingForm({
  defaultFullName,
}: {
  defaultFullName: string;
}) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion() === true;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      organizationName: String(fd.get("organizationName") ?? "").trim(),
      fullName: String(fd.get("fullName") ?? "").trim(),
    };

    startTransition(async () => {
      const result = await completeOnboarding(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/dashboard");
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
            Create your workspace
          </CardTitle>
          <CardDescription className="text-pretty">
            Create your workspace and confirm your display name.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <motion.div {...fieldContainerProps}>
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
                <Label htmlFor="onboard-org">Organization name</Label>
                <Input
                  id="onboard-org"
                  name="organizationName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Example: Apex Design"
                  required
                  className="focus-visible:ring-primary/25 rounded-xl transition-shadow duration-200"
                />
              </motion.div>
              <motion.div
                variants={prefersReducedMotion ? undefined : staggerFieldItem}
                className="space-y-2"
              >
                <Label htmlFor="onboard-you">Your name</Label>
                <Input
                  id="onboard-you"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  defaultValue={defaultFullName}
                  required
                  className="focus-visible:ring-primary/25 rounded-xl transition-shadow duration-200"
                />
              </motion.div>
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
                Finish setup
              </Button>
            </motion.div>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
