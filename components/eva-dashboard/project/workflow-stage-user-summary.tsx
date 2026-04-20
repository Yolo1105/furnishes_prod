"use client";

import { cn } from "@/lib/utils";
import type { WorkflowEvaluation } from "@/lib/eva/projects/api-types";
import {
  isWorkflowStageId,
  STAGE_NEXT_HINT,
  STAGE_USER_SUMMARY,
  stageDisplayLabel,
} from "@/lib/eva/design-workflow/stages";

type WorkflowStageUserSummaryProps = {
  /** Raw `workflowStage` from API (e.g. Prisma enum string). */
  stage: string;
  /** When present (GET /api/projects/[id]), mirrors server evaluator copy. */
  evaluation?: WorkflowEvaluation | null;
  eyebrow?: string;
  className?: string;
};

/**
 * Product copy for “where we are” + “what’s next” — shared by Account project detail and Eva Project tab.
 */
export function WorkflowStageUserSummary({
  stage,
  evaluation,
  eyebrow = "Workflow",
  className,
}: WorkflowStageUserSummaryProps) {
  const wf = isWorkflowStageId(stage) ? stage : null;
  return (
    <div
      className={cn(
        "border-border text-foreground border text-sm leading-relaxed",
        className,
      )}
    >
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {eyebrow} · {stageDisplayLabel(stage)}
      </p>
      {evaluation ? (
        <>
          <p className="mt-2">{evaluation.transitionExplanation}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Next: {evaluation.evaRecommendsNext}
          </p>
          {evaluation.missingFieldList.length > 0 && (
            <p className="text-muted-foreground mt-2 text-xs">
              Open: {evaluation.missingFieldList.join(", ")}
            </p>
          )}
        </>
      ) : wf ? (
        <>
          <p className="mt-2">{STAGE_USER_SUMMARY[wf]}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Next: {STAGE_NEXT_HINT[wf]}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">
          This stage isn&apos;t recognized yet. Reload the project after
          chatting so workflow state can sync.
        </p>
      )}
    </div>
  );
}
