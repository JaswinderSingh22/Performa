import type { ReactNode, ReactElement } from "react";

import { Separator } from "@/components/ui/separator";

export function DashboardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): ReactElement {
  return (
    <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-10 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-6">
        <div className="min-w-0">
          <h1 className="font-heading truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground truncate text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <Separator />
    </header>
  );
}
