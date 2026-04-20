"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ListTodo,
  Pencil,
  Shield,
  Trash2,
} from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import type { ProjectExecutionTaskDto } from "@/lib/eva/projects/build-project-summary";
import type { PathIntegrityResult } from "@/lib/eva/projects/execution-orchestration";
import { PROJECT_EXECUTION_UI_COPY } from "@/lib/eva/projects/summary-constants";
import {
  apiDelete,
  apiPatch,
  apiPost,
  API_ROUTES,
} from "@/lib/eva-dashboard/api";
import {
  SectionCard,
  Eyebrow,
  Button,
  useToast,
  ConfirmDialog,
  Select,
  Textarea,
} from "@/components/eva-dashboard/account/shared";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  summary: ProjectSummaryDto;
  onRefresh: () => void;
};

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function integrityStyles(result: PathIntegrityResult) {
  switch (result) {
    case "valid":
      return "border-success-border bg-success text-success-foreground";
    case "risky":
      return "border-review-border bg-review text-review-foreground";
    case "blocked":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "needs_reevaluation":
      return "border-review-border bg-review text-review-foreground";
    default:
      return "border-border bg-muted/30";
  }
}

function ExecutionTaskRow({
  task,
  busy,
  editing,
  notesDraft,
  onNotesDraftChange,
  onPatch,
  onDeleteRequest,
  onToggleEdit,
  onSaveNotes,
}: {
  task: ProjectExecutionTaskDto;
  busy: boolean;
  editing: boolean;
  notesDraft: string;
  onNotesDraftChange: (v: string) => void;
  onPatch: (body: {
    status?: "open" | "in_progress" | "done" | "cancelled";
    priority?: "low" | "medium" | "high" | "urgent";
    description?: string | null;
  }) => void;
  onDeleteRequest: () => void;
  onToggleEdit: () => void;
  onSaveNotes: () => void;
}) {
  const isTerminal = task.status === "done" || task.status === "cancelled";

  return (
    <li
      className={cn(
        "border-border flex flex-col gap-2 rounded-md border p-3 text-sm",
        isTerminal && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <CircleDot className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <span className="font-medium">{task.title}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              · {task.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            className="h-8 min-w-[108px] text-xs"
            value={task.priority}
            disabled={busy}
            onChange={(e) =>
              onPatch({
                priority: e.target.value as (typeof PRIORITIES)[number],
              })
            }
            aria-label={PROJECT_EXECUTION_UI_COPY.taskPriorityAria}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          {isTerminal ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-2 text-[11px]"
              disabled={busy}
              onClick={() => onPatch({ status: "open" })}
            >
              {PROJECT_EXECUTION_UI_COPY.taskReopen}
            </Button>
          ) : (
            <>
              {task.status === "open" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2 text-[11px]"
                  disabled={busy}
                  onClick={() => onPatch({ status: "in_progress" })}
                >
                  {PROJECT_EXECUTION_UI_COPY.taskStart}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2 text-[11px]"
                  disabled={busy}
                  onClick={() => onPatch({ status: "open" })}
                >
                  {PROJECT_EXECUTION_UI_COPY.taskToDo}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2 text-[11px]"
                disabled={busy}
                onClick={() => onPatch({ status: "done" })}
              >
                {PROJECT_EXECUTION_UI_COPY.taskMarkDone}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2 text-[11px]"
                disabled={busy}
                onClick={() => onPatch({ status: "cancelled" })}
              >
                {PROJECT_EXECUTION_UI_COPY.taskCancel}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[11px]"
            disabled={busy}
            onClick={onToggleEdit}
          >
            <Pencil className="mr-1 h-3 w-3" />
            {PROJECT_EXECUTION_UI_COPY.taskEditNotes}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-8 px-2 text-[11px]"
            disabled={busy}
            onClick={onDeleteRequest}
            aria-label={PROJECT_EXECUTION_UI_COPY.taskDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {task.description && !editing ? (
        <p className="text-muted-foreground pl-6 text-xs leading-snug">
          {task.description}
        </p>
      ) : null}
      {editing ? (
        <div className="border-border space-y-2 border-t pt-2 pl-6">
          <Textarea
            value={notesDraft}
            onChange={(e) => onNotesDraftChange(e.target.value)}
            placeholder="Notes, links, or context for this task…"
            rows={3}
            className="text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void onSaveNotes()}
            >
              {PROJECT_EXECUTION_UI_COPY.taskSaveNotes}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={onToggleEdit}
            >
              {PROJECT_EXECUTION_UI_COPY.taskCancelEdit}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ProjectExecutionPanel({
  projectId,
  summary,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const ex = summary.execution;
  const volatile = ex.changeImpact?.volatile;

  const [taskTitle, setTaskTitle] = useState("");
  const [blockerTitle, setBlockerTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showClosedTasks, setShowClosedTasks] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const { activeTasks, closedTasks } = useMemo(() => {
    const tasks = ex.tasks;
    const active = tasks.filter(
      (t) => t.status === "open" || t.status === "in_progress",
    );
    const closed = tasks.filter(
      (t) => t.status === "done" || t.status === "cancelled",
    );
    return { activeTasks: active, closedTasks: closed };
  }, [ex.tasks]);

  async function patchTask(
    taskId: string,
    body: {
      status?: "open" | "in_progress" | "done" | "cancelled";
      priority?: "low" | "medium" | "high" | "urgent";
      description?: string | null;
    },
  ): Promise<boolean> {
    setBusy(taskId);
    try {
      await apiPatch(API_ROUTES.projectExecutionTask(projectId, taskId), body);
      toast.success("Task updated");
      onRefresh();
      return true;
    } catch {
      toast.error("Could not update task");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function addTask() {
    const t = taskTitle.trim();
    if (!t) return;
    setBusy("add-task");
    try {
      await apiPost(API_ROUTES.projectExecutionTasks(projectId), {
        title: t,
        status: "open",
        priority: "medium",
      });
      setTaskTitle("");
      toast.success("Task added");
      onRefresh();
    } catch {
      toast.error("Could not add task");
    } finally {
      setBusy(null);
    }
  }

  async function addBlocker() {
    const t = blockerTitle.trim();
    if (!t) return;
    setBusy("blocker");
    try {
      await apiPost(API_ROUTES.projectExecutionBlockers(projectId), {
        title: t,
        source: "user",
      });
      setBlockerTitle("");
      toast.success("Blocker added");
      onRefresh();
    } catch {
      toast.error("Could not add blocker");
    } finally {
      setBusy(null);
    }
  }

  async function resolveBlocker(blockerId: string, title: string) {
    setBusy(blockerId);
    try {
      await apiPatch(API_ROUTES.projectExecutionBlocker(projectId, blockerId), {
        status: "resolved",
        resolutionNotes: PROJECT_EXECUTION_UI_COPY.resolutionNotesFromPanel,
      });
      toast.success(`Resolved: ${title}`);
      onRefresh();
    } catch {
      toast.error("Could not resolve blocker");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDeleteTask() {
    if (!taskToDelete) return;
    const id = taskToDelete;
    setBusy(id);
    try {
      await apiDelete(API_ROUTES.projectExecutionTask(projectId, id));
      toast.success("Task removed");
      setTaskToDelete(null);
      if (editingNotesId === id) {
        setEditingNotesId(null);
        setNotesDraft("");
      }
      onRefresh();
    } catch {
      toast.error("Could not remove task");
    } finally {
      setBusy(null);
    }
  }

  function startEditNotes(task: ProjectExecutionTaskDto) {
    setEditingNotesId(task.id);
    setNotesDraft(task.description ?? "");
  }

  async function saveNotes(taskId: string) {
    const ok = await patchTask(taskId, {
      description: notesDraft.trim() === "" ? null : notesDraft.trim(),
    });
    if (ok) setEditingNotesId(null);
  }

  const noBaselineHint =
    volatile &&
    volatile.affectedAreas.length === 0 &&
    volatile.mustRevisit.length === 0 &&
    volatile.stillValid.length === 0;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-lg border p-4",
          integrityStyles(ex.pathIntegrity.result),
        )}
      >
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold tracking-wide uppercase opacity-80">
              Path integrity · {ex.pathIntegrity.result}
            </p>
            <ul className="mt-2 list-inside list-disc text-sm leading-snug">
              {ex.pathIntegrity.reasons.slice(0, 5).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {ex.recommendedLifecycle !== ex.lifecycle ? (
              <p className="mt-2 text-xs opacity-90">
                Suggested lifecycle: <strong>{ex.recommendedLifecycle}</strong>{" "}
                (stored: {ex.lifecycle})
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {volatile ? (
        <SectionCard padding="lg">
          <Eyebrow>{PROJECT_EXECUTION_UI_COPY.changeImpactEyebrow}</Eyebrow>
          {noBaselineHint ? (
            <p
              className="text-muted-foreground mt-3 text-sm leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {PROJECT_EXECUTION_UI_COPY.changeImpactBaselineHint}
            </p>
          ) : null}

          {volatile.affectedAreas.length > 0 ? (
            <div className="mt-4">
              <p className="text-foreground text-[10px] font-semibold tracking-wide uppercase opacity-90">
                {PROJECT_EXECUTION_UI_COPY.changeImpactAffected}
              </p>
              <ul className="mt-2 list-inside list-disc text-sm leading-snug">
                {volatile.affectedAreas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {volatile.stillValid.length > 0 ? (
            <div className="mt-4">
              <p className="text-foreground text-[10px] font-semibold tracking-wide uppercase opacity-90">
                {PROJECT_EXECUTION_UI_COPY.changeImpactStillValid}
              </p>
              <ul className="mt-2 list-inside list-disc text-sm leading-snug">
                {volatile.stillValid.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {volatile.mustRevisit.length > 0 ? (
            <div className="mt-4">
              <p className="text-foreground text-[10px] font-semibold tracking-wide uppercase opacity-90">
                {PROJECT_EXECUTION_UI_COPY.changeImpactRevisit}
              </p>
              <ul className="mt-2 list-inside list-disc text-sm leading-snug">
                {volatile.mustRevisit.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p
                className="text-muted-foreground mt-3 text-xs leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                {PROJECT_EXECUTION_UI_COPY.adaptationTip}
              </p>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard padding="lg">
        <Eyebrow>NEXT BEST ACTION</Eyebrow>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: "var(--foreground)" }}
        >
          {summary.nextBestAction}
        </p>
        <p
          className="mt-2 text-xs leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          Workflow guidance: {summary.nextStep}
        </p>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard padding="lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-review-muted h-4 w-4" />
            <Eyebrow>ACTIVE BLOCKERS</Eyebrow>
          </div>
          {ex.activeBlockers.length === 0 ? (
            <p
              className="text-muted-foreground mt-3 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No active execution blockers. Add one if something is stopping
              purchase or install.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {ex.activeBlockers.map((b) => (
                <li
                  key={b.id}
                  className="border-border flex flex-col gap-1 rounded-md border p-3 text-sm"
                >
                  <span className="font-medium">{b.title}</span>
                  {b.resolutionSuggestion ? (
                    <span className="text-muted-foreground text-xs">
                      Suggested: {b.resolutionSuggestion}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-1 w-fit"
                    disabled={busy === b.id}
                    onClick={() => void resolveBlocker(b.id, b.title)}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Mark resolved
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="border-input bg-background min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm"
              placeholder="New blocker title"
              value={blockerTitle}
              onChange={(e) => setBlockerTitle(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy === "blocker"}
              onClick={() => void addBlocker()}
            >
              Add blocker
            </Button>
          </div>
        </SectionCard>

        <SectionCard padding="lg">
          <div className="flex items-center gap-2">
            <ListTodo className="text-primary h-4 w-4" />
            <Eyebrow>EXECUTION TASKS</Eyebrow>
          </div>
          {activeTasks.length === 0 ? (
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No open tasks. Add concrete next steps (measure, order samples,
              confirm lead times).
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {activeTasks.map((t) => (
                <ExecutionTaskRow
                  key={t.id}
                  task={t}
                  busy={busy === t.id}
                  editing={editingNotesId === t.id}
                  notesDraft={editingNotesId === t.id ? notesDraft : ""}
                  onNotesDraftChange={setNotesDraft}
                  onPatch={(body) => void patchTask(t.id, body)}
                  onDeleteRequest={() => setTaskToDelete(t.id)}
                  onToggleEdit={() => {
                    if (editingNotesId === t.id) {
                      setEditingNotesId(null);
                      setNotesDraft("");
                    } else {
                      startEditNotes(t);
                    }
                  }}
                  onSaveNotes={() => void saveNotes(t.id)}
                />
              ))}
            </ul>
          )}

          {closedTasks.length > 0 ? (
            <div className="mt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[11px]"
                onClick={() => setShowClosedTasks((v) => !v)}
              >
                {showClosedTasks
                  ? PROJECT_EXECUTION_UI_COPY.taskHideClosed
                  : `${PROJECT_EXECUTION_UI_COPY.taskShowClosed} (${closedTasks.length})`}
              </Button>
              {showClosedTasks ? (
                <ul className="mt-3 space-y-3">
                  {closedTasks.map((t) => (
                    <ExecutionTaskRow
                      key={t.id}
                      task={t}
                      busy={busy === t.id}
                      editing={editingNotesId === t.id}
                      notesDraft={editingNotesId === t.id ? notesDraft : ""}
                      onNotesDraftChange={setNotesDraft}
                      onPatch={(body) => void patchTask(t.id, body)}
                      onDeleteRequest={() => setTaskToDelete(t.id)}
                      onToggleEdit={() => {
                        if (editingNotesId === t.id) {
                          setEditingNotesId(null);
                          setNotesDraft("");
                        } else {
                          startEditNotes(t);
                        }
                      }}
                      onSaveNotes={() => void saveNotes(t.id)}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="border-input bg-background min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm"
              placeholder="New task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy === "add-task"}
              onClick={() => void addTask()}
            >
              Add task
            </Button>
          </div>
        </SectionCard>
      </div>

      {ex.substitutionLog.length > 0 ? (
        <SectionCard padding="lg">
          <Eyebrow>RECENT PATH / SHORTLIST CHANGES</Eyebrow>
          <ul className="mt-3 space-y-2 text-sm">
            {ex.substitutionLog.slice(-6).map((s, i) => (
              <li key={`${s.at}-${i}`} style={{ color: "var(--foreground)" }}>
                <span className="text-muted-foreground text-xs">{s.at}</span> —{" "}
                {s.summary}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <ConfirmDialog
        open={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => void confirmDeleteTask()}
        title={PROJECT_EXECUTION_UI_COPY.confirmDeleteTaskTitle}
        body={PROJECT_EXECUTION_UI_COPY.confirmDeleteTaskBody}
        confirmLabel={PROJECT_EXECUTION_UI_COPY.taskDelete}
        destructive
      />
    </div>
  );
}
