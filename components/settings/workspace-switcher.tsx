"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setActiveWorkspace } from "@/actions/active-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspaceSwitcher({
  activeOrgId,
  options,
}: {
  activeOrgId: string;
  options: Array<{ id: string; name: string }>;
}): React.ReactElement | null {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (options.length <= 1) return null;

  return (
    <Card className="border-border/75 from-card/98 to-muted/[0.12] overflow-hidden bg-gradient-to-br shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Active workspace</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border-input bg-background text-foreground h-9 min-w-[240px] rounded-lg border px-2 text-sm shadow-sm outline-none"
            defaultValue={activeOrgId}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.value;
              setError(null);
              setBusy(true);
              void (async () => {
                const res = await setActiveWorkspace({ orgId: next });
                setBusy(false);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                router.refresh();
              })();
            }}
            aria-label="Select workspace"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => router.refresh()}
          >
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Switching workspaces changes what data you see across Employees, Reviews, and
          Settings.
        </p>
      </CardContent>
    </Card>
  );
}

