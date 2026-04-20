"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  PlayCircle,
  XCircle,
} from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import type { ProjectExecutionTaskDto } from "@/lib/eva/projects/build-project-summary";
import { apiDelete, apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { ProjectTargetCommentsPanel } from "@/components/eva-dashboard/project/project-target-comments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = ["open", "in_progress", "done", "cancelled"] as const;

const PRI_OPTIONS = ["low", "medium", "high", "urgent"] as const;

type Props = {
  projectId: string;
  summary: ProjectSummaryDto;
  className?: string;
  onTasksUpdated?: () => void;
};

export function ProjectExecutionTasksPanel({
  projectId,
  summary,
  className,
  onTasksUpdated,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const tasks = useMemo(
    () =>
      [...summary.execution.tasks].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
      ),
    [summary.execution.tasks],
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const patchTask = useCallback(
    async (taskId: string, body: Record<string, unknown>): Promise<boolean> => {
      setBusyId(taskId);
      try {
        await apiPatch<{ task: ProjectExecutionTaskDto }>(
          API_ROUTES.projectExecutionTask(projectId, taskId),
          body,
        );
        onTasksUpdated?.();
        return true;
      } catch {
        toast.error("Could not update task");
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [projectId, onTasksUpdated],
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      setBusyId(taskId);
      try {
        await apiDelete(API_ROUTES.projectExecutionTask(projectId, taskId));
        onTasksUpdated?.();
        toast.success("Task removed");
      } catch {
        toast.error("Could not remove task");
      } finally {
        setBusyId(null);
      }
    },
    [projectId, onTasksUpdated],
  );

  if (tasks.length === 0) {
    return (
      <section
        className={cn(
          "border-border bg-muted/10 rounded-lg border border-dashed p-4",
          className,
        )}
      >
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Execution tasks
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          No tasks yet — they appear when execution planning is recorded for
          this project.
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn("border-border bg-card rounded-lg border p-4", className)}
    >
      <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase">
        Execution tasks
      </p>
      <ul className="space-y-3">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="border-border flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {t.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : t.status === "in_progress" ? (
                  <PlayCircle className="text-primary h-4 w-4 shrink-0" />
                ) : t.status === "cancelled" ? (
                  <XCircle className="text-muted-foreground h-4 w-4 shrink-0" />
                ) : (
                  <Circle className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
                <span className="text-foreground text-sm font-medium">
                  {t.title}
                </span>
                {busyId === t.id ? (
                  <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
                ) : null}
              </div>
              {editingId === t.id ? (
                <div className="mt-2 pl-6">
                  <textarea
                    className="border-border bg-background text-foreground mb-2 min-h-[4rem] w-full max-w-md rounded border px-2 py-1.5 text-xs"
                    value={draftNotes[t.id] ?? t.description ?? ""}
                    onChange={(e) =>
                      setDraftNotes((prev) => ({
                        ...prev,
                        [t.id]: e.target.value,
                      }))
                    }
                    placeholder="Task notes (execution context)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="bg-primary text-primary-foreground rounded px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                      disabled={busyId === t.id}
                      onClick={() =>
                        void (async () => {
                          const ok = await patchTask(t.id, {
                            description:
                              (
                                draftNotes[t.id] ??
                                t.description ??
                                ""
                              ).trim() || null,
                          });
                          if (ok) setEditingId(null);
                        })()
                      }
                    >
                      Save notes
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground text-[11px] underline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : t.description ? (
                <p className="text-muted-foreground mt-1 pl-6 text-xs leading-relaxed">
                  {t.description}
                </p>
              ) : null}
              {editingId !== t.id ? (
                <button
                  type="button"
                  className="text-primary mt-1 pl-6 text-left text-[11px] font-medium underline"
                  onClick={() => {
                    setEditingId(t.id);
                    setDraftNotes((prev) => ({
                      ...prev,
                      [t.id]: t.description ?? "",
                    }));
                  }}
                >
                  {t.description ? "Edit notes" : "Add notes"}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <select
                className="border-border bg-background text-foreground rounded border px-2 py-1 text-[11px]"
                value={t.status}
                disabled={busyId === t.id}
                onChange={(e) =>
                  void patchTask(t.id, {
                    status: e.target.value,
                  })
                }
                aria-label="Task status"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <select
                className="border-border bg-background text-foreground rounded border px-2 py-1 text-[11px]"
                value={t.priority}
                disabled={busyId === t.id}
                onChange={(e) =>
                  void patchTask(t.id, {
                    priority: e.target.value,
                  })
                }
                aria-label="Task priority"
              >
                {PRI_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-destructive hover:bg-destructive/10 rounded px-2 py-1 text-[11px] font-medium"
                disabled={busyId === t.id}
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm("Remove this task?")
                  )
                    return;
                  void removeTask(t.id);
                }}
              >
                Remove
              </button>
            </div>
            <ProjectTargetCommentsPanel
              projectId={projectId}
              targetType="execution_task"
              targetId={t.id}
              label="Task review"
              compact
              deferLoad
              className="mt-3 w-full border-t pt-3"
              onThreadsChanged={onTasksUpdated}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
