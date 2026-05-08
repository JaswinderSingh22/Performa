"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayersIcon, PlusIcon } from "lucide-react";

import { setActiveWorkspace } from "@/actions/active-workspace";
import { CreateWorkspaceDialog } from "@/components/settings/create-workspace-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Switch between organisations you belong to, or create another workspace. */
export function WorkspaceHubCard({
  activeOrgId,
  activeOrgName,
  options,
}: {
  activeOrgId: string;
  activeOrgName: string;
  options: Array<{ id: string; name: string }>;
}): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [swapError, setSwapError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const sorted = React.useMemo(() => {
    return [...options].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [options]);

  return (
    <>
      <Card className="border-border/70 overflow-hidden shadow-md ring-1 ring-black/[0.04]">
        <CardHeader className="border-border/60 border-b bg-muted/25 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="bg-primary/10 text-primary border-primary/15 flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-sm">
                <LayersIcon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-heading text-xl tracking-tight">Workspaces</CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium uppercase tracking-wide"
                  >
                    Active
                  </Badge>
                </div>
                <CardDescription className="text-pretty leading-relaxed">
                  Each workspace has its own employees, review cycles, and billing. Switch anytime;
                  open a new workspace when you run another organisation.
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon className="size-4" aria-hidden />
              New workspace
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div>
            <p className="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wider">
              Current
            </p>
            <p className="font-heading text-foreground text-lg font-semibold tracking-tight">
              {activeOrgName || "Workspace"}
            </p>
          </div>

          {sorted.length > 1 ? (
            <div className="space-y-2">
              <label
                htmlFor="ws-switch"
                className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider"
              >
                Switch workspace
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="ws-switch"
                  className="border-input bg-background text-foreground focus-visible:ring-ring/35 h-10 min-w-[min(100%,280px)] flex-1 rounded-lg border px-3 text-sm shadow-sm outline-none focus-visible:ring-[3px]"
                  value={activeOrgId}
                  disabled={busy}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === activeOrgId) return;
                    setSwapError(null);
                    setBusy(true);
                    void (async () => {
                      const res = await setActiveWorkspace({ orgId: next });
                      setBusy(false);
                      if (!res.ok) {
                        setSwapError(res.error);
                        return;
                      }
                      router.refresh();
                    })();
                  }}
                  aria-label="Switch workspace"
                >
                  {sorted.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => router.refresh()}
                >
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-sm leading-relaxed">
              You&apos;re only in this workspace so far. Use <strong>New workspace</strong> above to
              add another organisation anytime.
            </p>
          )}

          {swapError ? (
            <p className="text-destructive text-sm" role="alert">
              {swapError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
