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

type MemberRow = {
  id: string;
  full_name: string;
  role: UserRole;
};

function roleLabel(r: UserRole): string {
  return r === "admin" ? "Admin" : "Manager";
}

export function WorkspaceMembersCard({
  members,
  createdByUserId,
  currentUserId,
  canManageRoles,
}: {
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
      const res = await updateWorkspaceMemberRole({ userId, role });
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
    <Card className="border-border/75 from-card/98 to-muted/[0.12] overflow-hidden bg-gradient-to-br shadow-md">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/11 text-primary border-primary/12 flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-inner">
            <UsersIcon className="size-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="font-heading text-lg tracking-tight">
              Workspace accounts
            </CardTitle>
            <CardDescription className="max-w-2xl text-pretty leading-relaxed">
              People who sign in to Performa in this workspace.{" "}
              {!canManageRoles
                ? "Only Admins can change roles."
                : "Owners stay Admin; you can assign Manager or Admin to others when you invite teammates."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="divide-border/60 divide-y rounded-xl border border-border/70">
          {sorted.map((m) => {
            const isOwner = createdByUserId !== null && m.id === createdByUserId;
            const showDropdown =
              canManageRoles && !isOwner && busyId !== m.id;

            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 first:rounded-t-xl last:rounded-b-xl"
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
                      <option value="manager">Manager</option>
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
