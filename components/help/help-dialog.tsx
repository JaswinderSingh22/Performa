"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  CopyIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
  MailIcon,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required.").max(140),
  message: z.string().trim().min(10, "Please describe the issue.").max(5000),
});

type FormValues = z.input<typeof formSchema>;

function encodeMailto(value: string): string {
  // encodeURIComponent but preserve newlines in a mailto-friendly way
  return encodeURIComponent(value).replace(/%0A/g, "%0D%0A");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function HelpDialog({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";
  const linkedInUrl = process.env.NEXT_PUBLIC_SUPPORT_LINKEDIN_URL?.trim() ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: "", message: "" },
  });

  React.useEffect(() => {
    if (!open) {
      setToast(null);
      form.reset();
    }
  }, [open, form]);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const onSubmit = form.handleSubmit(async (values) => {
    if (!supportEmail) {
      setToast("Support email is not configured.");
      return;
    }
    const body = [
      values.message.trim(),
      "",
      "---",
      pageUrl ? `Page: ${pageUrl}` : null,
    ]
      .filter((l): l is string => Boolean(l))
      .join("\n");

    const mailto = `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeMailto(
      `[PerformaAI Help] ${values.subject.trim()}`,
    )}&body=${encodeMailto(body)}`;
    window.location.href = mailto;
  });

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={collapsed ? "outline" : "ghost"}
        size={collapsed ? "icon-sm" : "sm"}
        className={
          className ??
          (collapsed
            ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary shadow-sm"
            : "hover:bg-muted/85 text-muted-foreground hover:text-foreground hover:border-border/65 w-full justify-start gap-2 rounded-xl border border-transparent px-2.5 shadow-sm transition-colors duration-200")
        }
        onClick={() => setOpen(true)}
        aria-label={collapsed ? "Help" : undefined}
        title={collapsed ? "Help" : undefined}
      >
        <HelpCircleIcon className="size-4 opacity-80" aria-hidden />
        {collapsed ? null : "Help"}
      </Button>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Help & support</DialogTitle>
            <DialogDescription>
              Share the issue via email or LinkedIn DM. We’ll get back to you soon.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {toast ? (
              <p className="text-muted-foreground text-sm" role="status">
                {toast}
              </p>
            ) : null}

            <div className="rounded-xl border border-border/70 bg-muted/10 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">Contact</p>
                  <p className="text-muted-foreground mt-1 truncate text-sm">
                    {supportEmail ? supportEmail : "Set NEXT_PUBLIC_SUPPORT_EMAIL"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!supportEmail}
                    onClick={() => {
                      if (!supportEmail) return;
                      void (async () => {
                        const ok = await copyText(supportEmail);
                        setToast(ok ? "Email copied." : "Could not copy.");
                      })();
                    }}
                  >
                    <CopyIcon className="size-3.5" aria-hidden />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!supportEmail}
                    onClick={() => {
                      if (!supportEmail) return;
                      window.location.href = `mailto:${encodeURIComponent(
                        supportEmail,
                      )}`;
                    }}
                  >
                    <MailIcon className="size-3.5" aria-hidden />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!linkedInUrl}
                    onClick={() => {
                      if (!linkedInUrl) return;
                      window.open(linkedInUrl, "_blank", "noreferrer");
                    }}
                    title={
                      linkedInUrl
                        ? "Open LinkedIn page"
                        : "Set NEXT_PUBLIC_SUPPORT_LINKEDIN_URL"
                    }
                  >
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                    LinkedIn
                  </Button>
                </div>
              </div>
              {pageUrl ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  Page: <span className="font-mono">{pageUrl}</span>
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="help-subject">Subject</Label>
              <Input id="help-subject" {...form.register("subject")} />
              {form.formState.errors.subject?.message ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.subject.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="help-message">What’s the issue?</Label>
              <Textarea
                id="help-message"
                rows={7}
                placeholder="Describe what you expected, what happened, and any steps to reproduce."
                {...form.register("message")}
              />
              {form.formState.errors.message?.message ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.message.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!supportEmail}>
              <MailIcon className="size-4" aria-hidden />
              Open email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

