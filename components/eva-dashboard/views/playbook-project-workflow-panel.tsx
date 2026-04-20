"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiGet, apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";
import {
  isWorkflowStageId,
  nextStage,
  STAGE_LABEL,
  stageDisplayLabel,
} from "@/lib/eva/design-workflow/stages";

export function PlaybookProjectWorkflowPanel({
  projectId,
}: {
  projectId: string;
}) {
  const [detail, setDetail] = useState<ProjectDetailGetResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    apiGet<ProjectDetailGetResponse>(API_ROUTES.project(projectId))
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load project workflow");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const stage = detail?.project.workflowStage;
  const wf = stage && isWorkflowStageId(stage) ? stage : null;
  const ev = detail?.workflowEvaluation;

  const refresh = () =>
    apiGet<ProjectDetailGetResponse>(API_ROUTES.project(projectId)).then(
      setDetail,
    );

  const advance = async () => {
    if (!wf || !detail) return;
    const evCur = detail.workflowEvaluation;
    const n =
      evCur.suggestedNextStage ?? (evCur.stageComplete ? nextStage(wf) : null);
    if (!n) return;
    setAdvancing(true);
    try {
      await apiPost(API_ROUTES.projectWorkflow(projectId), {
        toStage: n,
        force: false,
      });
      await refresh();
    } catch {
      /* surfaced via load state on retry */
    } finally {
      setAdvancing(false);
    }
  };

  if (loadError) {
    return (
      <div className="border-border bg-muted/30 text-muted-foreground border-b px-4 py-2 text-xs">
        {loadError}
      </div>
    );
  }

  if (!detail || !ev) {
    return (
      <div className="border-border flex items-center gap-2 border-b px-4 py-2 text-xs">
        <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
        Loading project workflow…
      </div>
    );
  }

  const linearNext = wf ? nextStage(wf) : null;
  const missing = ev.missingFieldList;
  const targetStage =
    ev.suggestedNextStage ?? (ev.stageComplete ? linearNext : null);
  const canAdvance = Boolean(targetStage) && ev.stageComplete;

  return (
    <div className="border-border bg-muted/15 shrink-0 border-b px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Active project · {detail.project.title}
          </p>
          <p className="text-foreground mt-1 text-sm font-medium">
            {wf ? STAGE_LABEL[wf] : stageDisplayLabel(stage ?? "")}
          </p>
          <p className="text-muted-foreground mt-1 max-w-2xl text-xs leading-relaxed">
            {ev.transitionExplanation}
          </p>
          <p className="text-muted-foreground mt-2 text-[11px]">
            <span className="text-foreground font-medium">Why this stage:</span>{" "}
            {ev.whyThisStage}
          </p>
          <p className="text-muted-foreground mt-2 text-[11px]">
            <span className="text-foreground font-medium">Eva suggests:</span>{" "}
            {ev.evaRecommendsNext}
          </p>
          {missing.length > 0 && (
            <p className="text-muted-foreground mt-2 text-[11px]">
              <span className="text-foreground font-medium">Still open:</span>{" "}
              {missing.join(", ")}
            </p>
          )}
          {detail.project.playbookUpdatedAt && (
            <p className="text-muted-foreground mt-1 text-[10px]">
              Workflow synced{" "}
              {new Date(detail.project.playbookUpdatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {targetStage && (
            <button
              type="button"
              disabled={advancing || !canAdvance}
              title={
                !canAdvance
                  ? "Complete the open items for this stage first (or use Account tools)."
                  : undefined
              }
              onClick={() => void advance()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
            >
              {advancing ? "Updating…" : `Move to ${STAGE_LABEL[targetStage]}`}
            </button>
          )}
          {!linearNext && wf && (
            <span className="text-muted-foreground text-[10px]">
              Final stage — hand off or archive in Account.
            </span>
          )}
        </div>
      </div>
      <details className="mt-3">
        <summary className="text-muted-foreground cursor-pointer text-[10px] font-semibold tracking-wide uppercase">
          Transition history (server)
        </summary>
        <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px]">
          {(detail.workflowHistory ?? []).length === 0 ? (
            <li className="text-muted-foreground">
              No transitions recorded yet.
            </li>
          ) : (
            (detail.workflowHistory ?? []).slice(0, 12).map((e) => (
              <li key={e.id} className="text-muted-foreground">
                <span className="text-foreground">
                  {stageDisplayLabel(e.toStage)}
                </span>{" "}
                · {e.trigger}
                {e.reason ? ` — ${e.reason}` : ""} ·{" "}
                {new Date(e.createdAt).toLocaleString()}
              </li>
            ))
          )}
        </ul>
      </details>
      <details className="mt-2">
        <summary className="text-muted-foreground cursor-pointer text-[10px] font-semibold tracking-wide uppercase">
          Required fields (this stage)
        </summary>
        <ul className="mt-2 space-y-1 text-[11px]">
          {ev.requiredFieldStatus.map((r) => (
            <li key={r.id} className="text-muted-foreground">
              <span className="text-foreground font-medium">{r.label}</span>:{" "}
              {r.status}
              {r.detail ? ` — ${r.detail}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
