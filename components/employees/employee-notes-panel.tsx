"use client";

import type { ReactElement } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  createEmployeeNote,
  deleteEmployeeNote,
  updateEmployeeNote,
} from "@/actions/employee-notes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { EmployeeNoteRow } from "@/types/database";
import { easingOut } from "@/lib/motion-variants";
import {
  employeeNoteFieldsSchema,
  type EmployeeNoteFieldsFormValues,
} from "@/validators/employee-note";

function buildDefaults(
  note: EmployeeNoteRow | null,
): EmployeeNoteFieldsFormValues {
  return {
    body: note?.body ?? "",
    note_date: note?.created_at?.slice(0, 10) ?? "",
  };
}

function NoteFormDialog({
  open,
  onOpenChange,
  employeeId,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  note: EmployeeNoteRow | null;
}): ReactElement {
  const router = useRouter();
  const isEdit = note !== null;

  const form = useForm<EmployeeNoteFieldsFormValues>({
    resolver: zodResolver(employeeNoteFieldsSchema),
    defaultValues: buildDefaults(note),
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(buildDefaults(note));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dialog snapshot reset
  }, [note, open]);

  const onSubmit = form.handleSubmit(async (fields) => {
    if (isEdit && note) {
      const result = await updateEmployeeNote({
        ...fields,
        id: note.id,
        employeeId,
      });
      if (!result.ok) {
        form.setError("root", { message: result.error });
        return;
      }
    } else {
      const result = await createEmployeeNote({ ...fields, employeeId });
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
      <DialogContent className="max-h-[90dvh] max-w-lg gap-0 overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit note" : "Add manager note"}
            </DialogTitle>
            <DialogDescription>
              Add as many discrete notes as you need—each is stored separately
              so you track context over time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            {form.formState.errors.root?.message ? (
              <p className="text-destructive text-sm" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="note-date">Date</Label>
              <Input id="note-date" type="date" {...form.register("note_date")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note-body">Note</Label>
              <Textarea
                id="note-body"
                rows={11}
                className="rounded-xl focus-visible:ring-primary/25"
                {...form.register("body")}
              />
              <p className="text-muted-foreground text-xs">
                {Number(20000).toLocaleString()} character limit.
              </p>
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
                "Add note"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function EmployeeNotesPanel({
  employeeId,
  notes,
}: {
  employeeId: string;
  notes: EmployeeNoteRow[];
}): ReactElement {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion() === true;
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [active, setActive] = React.useState<EmployeeNoteRow | null>(null);

  const sorted = [...notes].sort(
    (a, b) =>
      new Date(b.updated_at ?? b.created_at).getTime() -
      new Date(a.updated_at ?? a.created_at).getTime(),
  );

  const onDelete = async (row: EmployeeNoteRow): Promise<void> => {
    if (!window.confirm("Delete this note?")) return;
    const result = await deleteEmployeeNote({ id: row.id, employeeId });
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  };

  const itemMotion =
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.28, ease: easingOut },
        };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold">Notes</h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-xs leading-relaxed">
            Multiple private entries per teammate. Older single-field notes on
            the employee record were copied here when migrating.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1 rounded-xl shadow-sm"
          onClick={() => {
            setActive(null);
            setEditorOpen(true);
          }}
        >
          <PlusIcon className="size-3.5" aria-hidden />
          Add note
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No notes yet. Capture goals, reminders, or review themes incrementally.
        </p>
      ) : (
        <ScrollArea className="max-h-[520px] pr-3">
          <ul className="space-y-4">
            {sorted.map((row, index) => (
              <motion.li
                key={row.id}
                {...itemMotion}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        ...itemMotion.transition,
                        delay: index * 0.04,
                      }
                }
                className="border-border bg-card/50 ring-border/60 relative rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:shadow-black/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-muted-foreground flex items-start gap-2 text-xs tabular-nums">
                    <StickyNoteIcon className="text-primary mt-0.5 size-3.5 shrink-0 opacity-80" />
                    <span>
                      <span className="text-foreground tabular-nums font-medium">
                        {formatTs(row.updated_at ?? row.created_at)}
                      </span>
                      {row.updated_at !== row.created_at ? (
                        <span className="opacity-85"> · edited</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Edit note"
                      onClick={() => {
                        setActive(row);
                        setEditorOpen(true);
                      }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete note"
                      onClick={() => void onDelete(row)}
                    >
                      <Trash2Icon className="text-destructive size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {row.body}
                </p>
              </motion.li>
            ))}
          </ul>
        </ScrollArea>
      )}

      <NoteFormDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        employeeId={employeeId}
        note={active}
      />
    </div>
  );
}
