"use client";

import type { ReactElement } from "react";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  HashIcon,
  LayersIcon,
  MapPinIcon,
  PencilIcon,
} from "lucide-react";

import { renameOrganization } from "@/actions/organization";
import { planLabel, normalizePlan } from "@/lib/plans";
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

function planBadgeVariant(
  plan: string,
): "default" | "secondary" | "outline" | "destructive" {
  const p = plan.toLowerCase();
  if (p === "free") return "secondary";
  if (p === "pro_plus") return "default";
  if (p === "pro") return "default";
  if (p.includes("enterprise")) return "default";
  return "outline";
}

export function WorkspaceOrganizationSettings({
  workspaceId,
  name,
  plan,
  countryLabel,
  createdAt,
  canRename,
}: {
  workspaceId: string;
  name: string;
  plan: string;
  /** Resolved display name from ISO country or raw code */
  countryLabel?: string | null;
  createdAt: string | null;
  canRename: boolean;
}): ReactElement {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  const [saving, setSaving] = React.useState(false);
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [renameOk, setRenameOk] = React.useState(false);

  React.useEffect(() => {
    setDraft(name);
  }, [name]);

  const copyId = (): void => {
    void navigator.clipboard.writeText(workspaceId).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    });
  };

  const saveName = async (): Promise<void> => {
    setRenameError(null);
    setRenameOk(false);
    const trimmed = draft.trim();
    if (trimmed === name.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const result = await renameOrganization({ name: trimmed });
      if (!result.ok) {
        setRenameError(result.error);
        return;
      }
      setRenameOk(true);
      setEditing(false);
      router.refresh();
      window.setTimeout(() => setRenameOk(false), 2800);
    } finally {
      setSaving(false);
    }
  };

  const createdLabel =
    createdAt !== null
      ? new Date(createdAt).toLocaleDateString(undefined, {
          dateStyle: "long",
        })
      : "—";

  return (
    <Card className="border-border/75 from-card/98 to-muted/[0.12] relative overflow-hidden bg-gradient-to-br shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/22 to-transparent" />

      <CardHeader className="gap-3 pb-2 md:flex-row md:items-start md:justify-between md:space-y-0">
        <div className="flex items-start gap-3">
          <div className="bg-primary/11 text-primary border-primary/12 flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-inner">
            <Building2Icon className="size-[1.35rem]" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="font-heading text-xl tracking-tight md:text-2xl">
              Workspace
            </CardTitle>
            <CardDescription className="max-w-xl text-pretty leading-relaxed">
              Name, plan, and workspace ID. Share the ID only with people who need it for support.
            </CardDescription>
          </div>
        </div>
        <Badge
          variant={planBadgeVariant(plan)}
          className="h-7 shrink-0 font-medium tabular-nums"
        >
          {planLabel(normalizePlan(plan))}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-0 pt-4">
        {renameOk ? (
          <p className="text-primary mb-4 text-sm font-medium" role="status">
            Workspace name updated.
          </p>
        ) : null}

        <dl className="space-y-1">
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-1 gap-3">
              <LayersIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 space-y-1">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Display name
                </dt>
                {editing ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="grid w-full gap-2 sm:max-w-md">
                      <Label htmlFor="ws-name" className="sr-only">
                        Workspace name
                      </Label>
                      <Input
                        id="ws-name"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={saving}
                        className="h-10"
                      />
                      {renameError ? (
                        <p className="text-destructive text-xs">{renameError}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        onClick={() => void saveName()}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => {
                          setDraft(name);
                          setEditing(false);
                          setRenameError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <dd className="text-foreground flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight">
                    <span className="truncate">{name || "—"}</span>
                    {canRename ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground -ml-0.5"
                        aria-label="Rename workspace"
                        onClick={() => {
                          setDraft(name);
                          setEditing(true);
                          setRenameError(null);
                        }}
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                    ) : null}
                  </dd>
                )}
                {!canRename && !editing ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Ask a workspace admin to rename the organization.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-1 gap-3">
              <HashIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Workspace ID
                </dt>
                <dd className="font-mono text-foreground text-sm leading-relaxed break-all sm:text-[13px]">
                  {workspaceId}
                </dd>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-medium"
                    onClick={() => void copyId()}
                  >
                    {copied ? (
                      <CheckIcon className="size-3.5 text-emerald-600" aria-hidden />
                    ) : (
                      <CopyIcon className="size-3.5" aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy full ID"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3 py-4">
            <MapPinIcon
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Manager country
              </dt>
              <dd className="text-foreground font-medium">{countryLabel || "—"}</dd>
              <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
                Captured when the workspace was created. Pricing is quoted in ₹ INR for
                every region.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3 py-4">
            <CalendarIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Created
              </dt>
              <dd className="text-foreground font-medium">{createdLabel}</dd>
            </div>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function SettingsWorkspaceTipsCard(): ReactElement {
  return (
    <Card className="border-border/60 bg-muted/20 h-fit border-dashed shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Roles & billing
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          The person who creates the workspace is the owner and stays Admin by default.
          Admins manage plans and billing; once teammates sign in, assign Manager or Admin
          in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground pt-0 text-xs leading-relaxed">
        Billing runs through Razorpay in ₹. Use the directory and review tools while your
        admins pick the right tier.
      </CardContent>
    </Card>
  );
}

export function SettingsQuickLinksCard(): ReactElement {
  return (
    <Card className="border-border/75 h-fit shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">
          Quick links
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Personal preferences and directory-wide tools live outside this screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full justify-between font-normal"
          render={<Link href="/profile" />}
          nativeButton={false}
        >
          Your profile
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full justify-between font-normal"
          render={<Link href="/employees" />}
          nativeButton={false}
        >
          Employee directory
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full justify-between font-normal"
          render={<Link href="/dashboard" />}
          nativeButton={false}
        >
          Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
