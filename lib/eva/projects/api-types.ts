/**
 * Response shape for GET /api/projects/[id] — single source of truth for clients.
 */

import type {
  ProjectShortlistStatus,
  ShortlistItemExternalLifecycle,
} from "@prisma/client";
import type { WorkflowEvaluation } from "@/lib/eva/design-workflow/evaluate";
import type { ProjectSummaryDto } from "@/lib/eva/projects/build-project-summary";

export type { WorkflowEvaluation };
export type { ProjectSummaryDto };

export type ProjectWorkflowHistoryEntry = {
  id: string;
  fromStage: string | null;
  toStage: string;
  reason: string | null;
  trigger: string;
  createdAt: string;
};

/** Latest `ProjectStudioRoomSave` from Eva Studio (Generate → Arrange → Save). */
export type StudioRoomPieceSummary = {
  pieceId: string;
  title: string;
  orderIndex: number;
  /** Stable or provider preview URL for thumbnails */
  previewImageUrl: string | null;
};

export type LatestStudioRoomSaveSummary = {
  id: string;
  roomShapeId: string;
  widthM: number;
  depthM: number;
  environment: string;
  createdAt: string;
  placements: StudioRoomPieceSummary[];
};

/** Shortlist rows for this project (account project detail). */
export type ProjectShortlistRow = {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  priceCents: number;
  currency: string;
  coverHue: number;
  rationale: string | null;
  summary: string | null;
  reasonSelected: string | null;
  notes: string | null;
  status: ProjectShortlistStatus;
  /** Phase 7 — procurement / external execution. */
  externalLifecycle: ShortlistItemExternalLifecycle;
  sourceConversationId: string | null;
  sourceRecommendationId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Recent chat uploads / files attached to conversations in this project. */
export type ProjectFilePreview = {
  id: string;
  filename: string;
  conversationId: string;
  createdAt: string;
};

export type ProjectDetailGetResponse = {
  project: {
    id: string;
    title: string;
    description: string;
    room: string;
    roomType?: string | null;
    status: string;
    budgetCents: number;
    currency: string;
    coverHue: number;
    progress: number;
    workflowStage: string;
    briefSnapshot: unknown;
    workflowSatisfied: unknown;
    playbookUpdatedAt: string | null;
    decisionContext: unknown;
    recommendationsSnapshot: unknown;
    activeConversationId: string | null;
    executionLifecycle: string;
    executionNotes: string | null;
    updatedAt: string;
    createdAt: string;
  };
  conversations: {
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
  }[];
  workflowHistory: ProjectWorkflowHistoryEntry[];
  aggregates: { fileCount: number };
  shortlistItems: ProjectShortlistRow[];
  recentFiles: ProjectFilePreview[];
  /** Most recent saved 3D room layout from Eva Studio, if any. */
  latestStudioRoomSave: LatestStudioRoomSaveSummary | null;
  /** Central evaluator output — stage, gaps, next step (matches server truth). */
  workflowEvaluation: WorkflowEvaluation;
  /** Present when requested via `GET /api/projects/[id]?includeSummary=1`. */
  summary?: ProjectSummaryDto | null;
  /** Phase 6D — sharing and collaboration (present from current API). */
  collaboration?: {
    accessRole: string;
    isCanonicalOwner: boolean;
    members: Array<{
      id: string;
      userId: string;
      role: string;
      name: string | null;
      email: string | null;
      joinedAt: string;
    }>;
    pendingInvitations: Array<{
      id: string;
      email: string;
      role: string;
      invitedAt: string;
      expiresAt: string;
    }>;
  };
};

export type ProjectSummaryGetResponse = {
  summary: ProjectSummaryDto;
};
