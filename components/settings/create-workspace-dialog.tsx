"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { createWorkspace } from "@/actions/create-workspace";
import { MANAGER_COUNTRIES } from "@/lib/countries";
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

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            Create a separate organisation on Performa—you stay Admin. Billing and plans are per
            workspace.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await createWorkspace({
                organizationName: String(fd.get("organizationName") ?? "").trim(),
                countryCode: String(fd.get("countryCode") ?? "").trim(),
              });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              onOpenChange(false);
              router.refresh();
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="nw-org">Workspace name</Label>
            <Input
              id="nw-org"
              name="organizationName"
              required
              minLength={2}
              autoComplete="organization"
              placeholder="e.g. Grad Right Labs"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nw-country">Country</Label>
            <select
              id="nw-country"
              name="countryCode"
              required
              disabled={pending}
              className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
              defaultValue=""
            >
              <option value="" disabled>
                Select country
              </option>
              {MANAGER_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
              Create & switch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
