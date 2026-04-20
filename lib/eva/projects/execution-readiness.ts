import type { DesignWorkflowStage, ProjectStatus } from "@prisma/client";

/**
 * Derived execution phase — no separate DB column; computed from project status,
 * workflow, shortlist, and decision context so labels stay honest.
 */
export type ExecutionReadiness =
  | "exploring"
  | "narrowing"
  | "shortlisted"
  | "ready_for_execution"
  | "finalized";

export function deriveExecutionReadiness(input: {
  projectStatus: ProjectStatus;
  workflowStage: DesignWorkflowStage;
  handoffReady: boolean;
  shortlistCount: number;
  hasPrimaryShortlist: boolean;
  hasPreferredDirection: boolean;
  recommendationsHasSnapshot: boolean;
  /** Open review comments or pending milestone approvals — keeps phase at shortlist until cleared. */
  collaborationBlocksPromotion?: boolean;
}): ExecutionReadiness {
  const {
    projectStatus,
    workflowStage,
    handoffReady,
    shortlistCount,
    hasPrimaryShortlist,
    hasPreferredDirection,
    recommendationsHasSnapshot,
    collaborationBlocksPromotion,
  } = input;

  if (projectStatus === "archived" || projectStatus === "done") {
    return "finalized";
  }

  if (
    handoffReady &&
    shortlistCount > 0 &&
    hasPrimaryShortlist &&
    hasPreferredDirection
  ) {
    if (collaborationBlocksPromotion) {
      return "shortlisted";
    }
    return "ready_for_execution";
  }

  if (shortlistCount > 0) {
    return "shortlisted";
  }

  if (
    recommendationsHasSnapshot ||
    workflowStage === "recommendation_generation" ||
    workflowStage === "refinement"
  ) {
    return "narrowing";
  }

  return "exploring";
}

export const EXECUTION_READINESS_LABEL: Record<ExecutionReadiness, string> = {
  exploring: "Exploring options",
  narrowing: "Narrowing direction",
  shortlisted: "Shortlist in progress",
  ready_for_execution: "Ready for execution",
  finalized: "Finalized",
};
