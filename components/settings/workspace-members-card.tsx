"use client";

import type { ReactElement } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CrownIcon, Loader2Icon, UsersIcon } from "lucide-react";

import { updateWorkspaceMemberRole } from "@/actions/workspace-members";
import type { UserRole } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MemberRow = {
  id: string;
  full_name: string;
  role: UserRole;
};

function roleLabel(r: UserRole): string {
  if (r === "admin") return "Admin";
  if (r === "hr") return "HR";
  if (r === "tl") return "TL";
  return "Manager";
}

export function WorkspaceMembersCard({
  workspaceId,
  members,
  createdByUserId,
  currentUserId,
  canManageRoles,
}: {
  workspaceId: string;
  members: MemberRow[];
  createdByUserId: string | null;
  currentUserId: string;
  canManageRoles: boolean;
}): ReactElement {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onRoleChange = async (userId: string, role: UserRole): Promise<void> => {
    setError(null);
    setBusyId(userId);
    try {
      const res = await updateWorkspaceMemberRole({ orgId: workspaceId, userId, role });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const sorted = React.useMemo(() => {
    return [...members].sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "", undefined, {
        sensitivity: "base",
      }),
    );
  }, [members]);

  return (
    <Card className="border-border/70 overflow-hidden shadow-md ring-1 ring-black/[0.04]">
      <CardHeader className="border-border/60 bg-muted/20 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary border-primary/15 flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm">
              <UsersIcon className="size-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="font-heading text-lg tracking-tight">People & access</CardTitle>
              <CardDescription className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed">
                Logins tied to this workspace.{" "}
                {!canManageRoles
                  ? "Only admins can change roles."
                  : "Owners keep Admin; use the directory to invite teammates first, then assign roles here."}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-0 pb-4">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="border-border/60 overflow-hidden rounded-none border-x-0 border-b-0 border-t bg-muted/15">
          <div className="text-muted-foreground border-border/50 grid grid-cols-[1fr_auto] gap-2 border-b bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider">
            <span>Member</span>
            <span className="text-right">Workspace role</span>
          </div>
          {sorted.map((m, index) => {
            const isOwner = createdByUserId !== null && m.id === createdByUserId;
            const showDropdown =
              canManageRoles && !isOwner && busyId !== m.id;

            return (
              <div
                key={m.id}
                className={cn(
                  "border-border/50 hover:bg-muted/25 grid grid-cols-1 items-center gap-3 border-b px-4 py-3.5 transition-colors sm:grid-cols-[1fr_auto] sm:gap-4",
                  index % 2 === 1 && "bg-muted/10",
                  index === sorted.length - 1 && "border-b-0",
                )}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-medium">{m.full_name}</span>
                    {isOwner ? (
                      <span className="text-muted-foreground inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium">
                        <CrownIcon className="size-3" aria-hidden />
                        Org owner · Admin
                      </span>
                    ) : null}
                    {m.id === currentUserId && !isOwner ? (
                      <span className="text-muted-foreground text-[11px]">You</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {busyId === m.id ? (
                    <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
                  ) : showDropdown ? (
                    <select
                      aria-label={`Role for ${m.full_name}`}
                      key={`${m.id}-${m.role}`}
                      defaultValue={m.role}
                      onChange={(e) => {
                        const next = e.target.value as UserRole;
                        void onRoleChange(m.id, next);
                      }}
                      className="border-input bg-background focus-visible:border-ring text-foreground h-9 rounded-lg border px-2 text-xs shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    >
                      <option value="admin">Admin</option>
                      <option value="hr">HR</option>
                      <option value="manager">Manager</option>
                      <option value="tl">TL</option>
                    </select>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {roleLabel(m.role)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
