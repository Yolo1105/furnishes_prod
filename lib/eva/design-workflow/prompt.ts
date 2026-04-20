import { WORKFLOW_LLM_HINTS } from "@/lib/eva/design-workflow/definition";
import type { WorkflowEvaluation } from "@/lib/eva/design-workflow/evaluate";
import {
  buildWorkflowStageOverlay,
  type WorkflowStageId,
} from "@/lib/eva/design-workflow/stages";

/**
 * Injects design-workflow stage behavior plus optional live evaluation (missing fields, rationale).
 */
export function mergeDesignWorkflowIntoSystemPrompt(
  basePrompt: string,
  stage: WorkflowStageId,
  evaluation?: WorkflowEvaluation | null,
): string {
  let block = buildWorkflowStageOverlay(stage);
  if (evaluation) {
    const gaps =
      evaluation.missingFieldList.length > 0
        ? `${WORKFLOW_LLM_HINTS.checklistPrefix} ${evaluation.missingFieldList.join(", ")}.`
        : null;
    const blockers = evaluation.hasRecommendationBlockers
      ? WORKFLOW_LLM_HINTS.recommendationBlockersReminder
      : null;
    block += `\n\n${WORKFLOW_LLM_HINTS.workflowContextHeader}\n${evaluation.whyThisStage}\n${evaluation.transitionExplanation}`;
    if (gaps) block += `\n${gaps}`;
    if (blockers && stage !== "intake" && stage !== "preference_capture")
      block += `\n${blockers}`;
    block += `\n${WORKFLOW_LLM_HINTS.userFacingNextPrefix} ${evaluation.evaRecommendsNext}`;
  }
  block += `\n\n${WORKFLOW_LLM_HINTS.conversationalDelivery}`;
  return `${basePrompt.trim()}\n\n${block}`;
}
