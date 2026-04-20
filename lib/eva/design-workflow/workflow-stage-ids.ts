/** Mirrors Prisma `DesignWorkflowStage` — shared without pulling in playbook copy. */
export const WORKFLOW_STAGE_ORDER = [
  "intake",
  "preference_capture",
  "clarification",
  "recommendation_generation",
  "refinement",
  "decision_handoff",
] as const;

export type WorkflowStageId = (typeof WORKFLOW_STAGE_ORDER)[number];

export function isWorkflowStageId(s: string): s is WorkflowStageId {
  return (WORKFLOW_STAGE_ORDER as readonly string[]).includes(s);
}

/** Zod `z.enum()` tuple — keep in sync with Prisma. */
export const WORKFLOW_STAGE_ZOD_ENUM = WORKFLOW_STAGE_ORDER as unknown as [
  WorkflowStageId,
  ...WorkflowStageId[],
];
