"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createAchievement,
  deleteAchievement,
  updateAchievement,
} from "@/actions/achievements";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { AchievementRow } from "@/types/database";
import {
  achievementFieldsSchema,
  type AchievementFieldsFormValues,
} from "@/validators/achievement";

function buildDefaults(
  achievement: AchievementRow | null,
): AchievementFieldsFormValues {
  return {
    title: achievement?.title ?? "",
    description: achievement?.description ?? "",
    category: achievement?.category ?? "general",
    achievement_date: achievement?.achievement_date ?? "",
  };
}

function AchievementFormDialog({
  open,
  onOpenChange,
  employeeId,
  achievement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  achievement: AchievementRow | null;
}): React.ReactElement {
  const router = useRouter();
  const isEdit = achievement !== null;

  const form = useForm<AchievementFieldsFormValues>({
    resolver: zodResolver(achievementFieldsSchema),
    defaultValues: buildDefaults(achievement),
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(buildDefaults(achievement));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset snapshot when switching records
  }, [achievement, open]);

  const onSubmit = form.handleSubmit(async (fields) => {
    if (isEdit && achievement) {
      const result = await updateAchievement({
        ...fields,
        id: achievement.id,
        employeeId,
      });
      if (!result.ok) {
        form.setError("root", { message: result.error });
        return;
      }
    } else {
      const result = await createAchievement({
        ...fields,
        employeeId,
      });
      if (!result.ok) {
        form.setError("root", { message: result.error });
        return;
      }
    }
    onOpenChange(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit achievement" : "Add achievement"}
            </DialogTitle>
            <DialogDescription>
              Capture milestones to reference when drafting a review.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {form.formState.errors.root?.message ? (
              <p className="text-destructive text-sm" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="ach-title">Title</Label>
              <Input id="ach-title" {...form.register("title")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ach-cat">Category</Label>
              <Input id="ach-cat" {...form.register("category")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ach-date">Date</Label>
              <Input
                id="ach-date"
                type="date"
                {...form.register("achievement_date")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ach-desc">Description</Label>
              <Textarea
                id="ach-desc"
                rows={4}
                {...form.register("description")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add achievement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AchievementsPanel({
  employeeId,
  achievements,
  readOnly = false,
}: {
  employeeId: string;
  achievements: AchievementRow[];
  readOnly?: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [active, setActive] = React.useState<AchievementRow | null>(null);

  const openCreate = () => {
    if (readOnly) return;
    setActive(null);
    setEditorOpen(true);
  };

  const openEdit = (row: AchievementRow) => {
    if (readOnly) return;
    setActive(row);
    setEditorOpen(true);
  };

  const onDelete = async (row: AchievementRow) => {
    if (!window.confirm("Delete this achievement?")) return;
    const result = await deleteAchievement({
      id: row.id,
      employeeId,
    });
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  };

  const sorted = [...achievements].sort((a, b) => {
    const ad = a.achievement_date
      ? new Date(a.achievement_date).getTime()
      : new Date(a.created_at).getTime();
    const bd = b.achievement_date
      ? new Date(b.achievement_date).getTime()
      : new Date(b.created_at).getTime();
    return bd - ad;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-medium">Timeline</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={openCreate}
          disabled={readOnly}
          title={
            readOnly
              ? "This employee is locked because your workspace is over the seat limit."
              : undefined
          }
        >
          <PlusIcon className="size-3.5" />
          Add
        </Button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No achievements yet. Capture wins as they happen.
        </p>
      ) : (
        <ScrollArea className="max-h-[420px] pr-3">
          <ul className="border-muted relative space-y-6 border-l pl-6">
            {sorted.map((row) => (
              <li key={row.id} className="relative">
                <span className="bg-background ring-border absolute top-2 -left-[25px] size-2 rounded-full ring-2" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.title}</p>
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      {row.category}
                      {row.achievement_date ? ` · ${row.achievement_date}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Edit achievement"
                      onClick={() => openEdit(row)}
                      disabled={readOnly}
                      title={
                        readOnly
                          ? "This employee is locked because your workspace is over the seat limit."
                          : undefined
                      }
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete achievement"
                      onClick={() => void onDelete(row)}
                      disabled={readOnly}
                      title={
                        readOnly
                          ? "This employee is locked because your workspace is over the seat limit."
                          : undefined
                      }
                    >
                      <Trash2Icon className="text-destructive size-4" />
                    </Button>
                  </div>
                </div>
                {row.description ? (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {row.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
      <AchievementFormDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        employeeId={employeeId}
        achievement={active}
      />
    </div>
  );
}
