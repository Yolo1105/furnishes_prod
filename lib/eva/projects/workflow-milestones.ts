import type { WorkflowEvaluation } from "@/lib/eva/design-workflow/evaluate";
import {
  isWorkflowStageId,
  STAGE_LABEL,
  type WorkflowStageId,
} from "@/lib/eva/design-workflow/stages";
import { WORKFLOW_MILESTONE_HINT } from "@/lib/eva/projects/workflow-milestone-copy";

export type WorkflowMilestone = {
  id: string;
  label: string;
  hint: string;
};

/**
 * User-facing milestone cues aligned with Phase 4B workflow evaluation (no fake status).
 */
export function deriveWorkflowMilestone(args: {
  stage: string;
  evaluation: WorkflowEvaluation;
}): WorkflowMilestone {
  const stage = isWorkflowStageId(args.stage) ? args.stage : "intake";
  const ev = args.evaluation;

  if (!ev.stageComplete && ev.missingFieldList.length > 0) {
    return {
      id: "gathering",
      label: "Gathering project context",
      hint: `Complete: ${ev.missingFieldList.join(", ")}.`,
    };
  }

  switch (stage) {
    case "intake":
    case "preference_capture":
    case "clarification":
      return {
        id: "direction",
        label: "Shaping direction",
        hint:
          stage === "clarification"
            ? WORKFLOW_MILESTONE_HINT.directionClarification
            : WORKFLOW_MILESTONE_HINT.directionDefault,
      };
    case "recommendation_generation":
      return {
        id: "compare",
        label: "Ready to compare directions",
        hint: WORKFLOW_MILESTONE_HINT.compare,
      };
    case "refinement":
      return {
        id: "refine",
        label: "Refining your choice",
        hint: WORKFLOW_MILESTONE_HINT.refine,
      };
    case "decision_handoff":
      return {
        id: "handoff",
        label: "Ready to export & hand off",
        hint: WORKFLOW_MILESTONE_HINT.handoff,
      };
    default:
      return {
        id: "active",
        label: STAGE_LABEL[stage as WorkflowStageId],
        hint: ev.evaRecommendsNext,
      };
  }
}
