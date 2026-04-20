import { PLAYBOOK_STAGES } from "@/lib/eva/design-workflow/definition";
import {
  WORKFLOW_STAGE_ORDER,
  WORKFLOW_STAGE_ZOD_ENUM,
  type WorkflowStageId,
  isWorkflowStageId,
} from "@/lib/eva/design-workflow/workflow-stage-ids";

export {
  WORKFLOW_STAGE_ORDER,
  WORKFLOW_STAGE_ZOD_ENUM,
  type WorkflowStageId,
  isWorkflowStageId,
};

export const STAGE_LABEL: Record<WorkflowStageId, string> = Object.fromEntries(
  WORKFLOW_STAGE_ORDER.map((id) => [id, PLAYBOOK_STAGES[id].name]),
) as Record<WorkflowStageId, string>;

/** User-facing label: canonical names for known stages, else humanize API/DB slugs. */
export function stageDisplayLabel(stage: string): string {
  if (isWorkflowStageId(stage)) return STAGE_LABEL[stage];
  return stage.replace(/_/g, " ");
}

export const STAGE_USER_SUMMARY: Record<WorkflowStageId, string> =
  Object.fromEntries(
    WORKFLOW_STAGE_ORDER.map((id) => [id, PLAYBOOK_STAGES[id].description]),
  ) as Record<WorkflowStageId, string>;

export const STAGE_NEXT_HINT: Record<WorkflowStageId, string> =
  Object.fromEntries(
    WORKFLOW_STAGE_ORDER.map((id) => [id, PLAYBOOK_STAGES[id].nextStepMessage]),
  ) as Record<WorkflowStageId, string>;

/** Assistant-facing overlay: priorities and behaviors for the model. */
export function buildWorkflowStageOverlay(stage: WorkflowStageId): string {
  const raw = PLAYBOOK_STAGES[stage].assistantGuidance;
  /** Drop loud “Workflow stage:” line — keep internal priorities without meta labels. */
  return raw.replace(/^Workflow stage:\s*[^\n]+\s*\n?/i, "").trim();
}

export function nextStage(current: WorkflowStageId): WorkflowStageId | null {
  const i = WORKFLOW_STAGE_ORDER.indexOf(current);
  if (i < 0 || i >= WORKFLOW_STAGE_ORDER.length - 1) return null;
  return WORKFLOW_STAGE_ORDER[i + 1] ?? null;
}
