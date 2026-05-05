"use client";

import * as React from "react";
import { Loader2Icon, MailIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { updateProfile } from "@/actions/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { easingOut } from "@/lib/motion-variants";

function roleLabel(role: string): string {
  if (role === "admin") return "Administrator";
  if (role === "manager") return "Manager";
  return role;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export type ProfileFormInitial = {
  email: string;
  full_name: string;
  role: string;
  job_title: string;
  department: string;
  years_experience: number | null;
  bio: string;
};

export function ProfileForm({ initial }: { initial: ProfileFormInitial }) {
  const prefersReducedMotion = useReducedMotion() === true;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [fullName, setFullName] = React.useState(initial.full_name);
  const [jobTitle, setJobTitle] = React.useState(initial.job_title);
  const [department, setDepartment] = React.useState(initial.department);
  const [years, setYears] = React.useState(
    initial.years_experience == null ? "" : String(initial.years_experience),
  );
  const [bio, setBio] = React.useState(initial.bio);

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    let yearsParsed: number | null = null;
    const trimmedYears = years.trim();
    if (trimmedYears.length > 0) {
      const n = Number(trimmedYears);
      if (!Number.isFinite(n)) {
        setError("Enter a valid years of experience value.");
        return;
      }
      yearsParsed = n;
    }

    startTransition(async () => {
      const result = await updateProfile({
        fullName,
        jobTitle,
        department,
        bio,
        yearsExperience: yearsParsed === null ? undefined : yearsParsed,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  };

  const motionCard = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.38, ease: easingOut },
      };

  return (
    <motion.div {...motionCard} className="mx-auto w-full max-w-4xl px-6 pb-10">
      <div className="grid gap-6 lg:grid-cols-[260px,_1fr]">
        <aside className="space-y-4">
          <div className="border-border/70 bg-card/80 ring-border/60 flex flex-col items-center gap-4 rounded-2xl border p-8 text-center shadow-sm ring-1 backdrop-blur-sm">
            <div className="from-primary font-heading flex size-[4.75rem] items-center justify-center rounded-2xl bg-gradient-to-br to-[oklch(0.45_0.15_286)] text-2xl font-semibold tracking-tight text-white shadow-inner">
              {initials(fullName)}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-heading truncate text-lg leading-tight font-semibold">
                {fullName.trim() || "Your name"}
              </p>
              <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                <MailIcon
                  className="size-3.5 shrink-0 opacity-70"
                  aria-hidden
                />
                <span className="truncate">{initial.email}</span>
              </div>
              <Badge variant="secondary" className="ring-border/70 mt-2 ring-1">
                {roleLabel(initial.role)}
              </Badge>
            </div>
            <Separator className="bg-border w-full opacity-70" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Your workspace role defines organization permissions. Adjust other
              details here anytime.
            </p>
          </div>
        </aside>

        <form onSubmit={onSubmit}>
          <Card className="border-border/60 bg-card/90 ring-border/50 rounded-2xl shadow-lg ring-1 shadow-black/[0.03] backdrop-blur-sm dark:shadow-black/20">
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="text-xl font-semibold tracking-tight">
                Profile details
              </CardTitle>
              <CardDescription className="text-pretty">
                Colleagues in your workspace may see these fields wherever your
                name appears.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {error ? (
                <p
                  className="bg-destructive/8 text-destructive ring-destructive/15 rounded-xl px-4 py-3 text-sm ring-1"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="text-primary bg-primary/8 ring-primary/15 rounded-xl px-4 py-3 text-sm ring-1">
                  Your profile has been saved.
                </p>
              ) : null}

              <section className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold tracking-tight">
                  Basic information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-full">Full name</Label>
                    <Input
                      id="profile-full"
                      value={fullName}
                      onChange={(ev) => setFullName(ev.target.value)}
                      autoComplete="name"
                      required
                      className="focus-visible:ring-primary/25 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-job">
                      Role or title<span className="sr-only"> (job)</span>
                    </Label>
                    <Input
                      id="profile-job"
                      placeholder="Engineering Manager"
                      value={jobTitle}
                      onChange={(ev) => setJobTitle(ev.target.value)}
                      className="focus-visible:ring-primary/25 rounded-xl"
                      autoComplete="organization-title"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-dept">Department</Label>
                    <Input
                      id="profile-dept"
                      placeholder="Product"
                      value={department}
                      onChange={(ev) => setDepartment(ev.target.value)}
                      className="focus-visible:ring-primary/25 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-years">Years of experience</Label>
                    <Input
                      id="profile-years"
                      inputMode="decimal"
                      placeholder="Leave blank if not applicable"
                      value={years}
                      onChange={(ev) =>
                        setYears(
                          ev.target.value
                            .replace(/[^\d.]/g, "")
                            .replace(/(\..*)\./g, "$1"),
                        )
                      }
                      className="focus-visible:ring-primary/25 rounded-xl tabular-nums"
                    />
                    <p className="text-muted-foreground text-xs">
                      Approximate professional experience in years (decimals allowed, e.g. 2.5).
                    </p>
                  </div>
                </div>
              </section>

              <div className="space-y-2">
                <Label htmlFor="profile-bio">About you</Label>
                <Textarea
                  id="profile-bio"
                  rows={5}
                  value={bio}
                  onChange={(ev) => setBio(ev.target.value)}
                  placeholder="How you coach, strengths, current focus..."
                  maxLength={2000}
                  className="focus-visible:ring-primary/25 rounded-xl"
                />
                <p className="text-muted-foreground text-xs">
                  Optional—up to {String(2000)} characters.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t pt-6">
                <motion.div
                  {...(prefersReducedMotion
                    ? {}
                    : { whileTap: { scale: 0.985 } })}
                >
                  <Button
                    type="submit"
                    disabled={pending}
                    className="rounded-xl px-6 shadow-sm"
                  >
                    {pending ? (
                      <Loader2Icon
                        className="size-4 shrink-0 animate-spin"
                        aria-hidden
                      />
                    ) : null}
                    Save profile
                  </Button>
                </motion.div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  className="text-muted-foreground rounded-xl"
                  onClick={() => {
                    setFullName(initial.full_name);
                    setJobTitle(initial.job_title);
                    setDepartment(initial.department);
                    setYears(
                      initial.years_experience == null
                        ? ""
                        : String(initial.years_experience),
                    );
                    setBio(initial.bio);
                    setError(null);
                    setSuccess(false);
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </motion.div>
  );
}
