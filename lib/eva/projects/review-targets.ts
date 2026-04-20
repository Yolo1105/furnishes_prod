import type { ProjectCommentTargetType } from "@prisma/client";

/**
 * Phase 6D — canonical review-thread addressing for `ProjectComment` rows.
 * Every thread is scoped by `projectId` (API path) plus `targetType` + `targetId`.
 */
export type ProjectReviewThreadRef = {
  projectId: string;
  targetType: ProjectCommentTargetType;
  targetId: string;
};

/** Stable synthetic ids for `targetType: project` threads (distinct from overview `targetId = projectId`). */
export const PROJECT_REVIEW_SYNTHETIC_TARGET = {
  /** Execution package / chosen-path review (comments on the “package”, not the whole project overview). */
  executionPackage: "__furnishes_execution_package__",
} as const;
