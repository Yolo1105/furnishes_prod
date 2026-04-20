import type { PrismaClient } from "@prisma/client";
import { getPreferencesAsRecord } from "@/lib/eva/api/helpers";
import { evaluateProjectWorkflow } from "@/lib/eva/design-workflow/evaluate";
import type { WorkflowEvaluation } from "@/lib/eva/design-workflow/evaluate";
import {
  isWorkflowStageId,
  type WorkflowStageId,
} from "@/lib/eva/design-workflow/workflow-stage-ids";
import { parseBriefSnapshotEntries } from "@/lib/eva/projects/brief-snapshot";
import {
  type ProjectDecisionContext,
  parseDecisionContext,
  parseRecommendationsSnapshot,
} from "@/lib/eva/projects/decision-schemas";
import {
  listProjectArtifacts,
  orderArtifactsFavoritesFirst,
} from "@/lib/eva/projects/list-project-artifacts";
import { INTELLIGENCE_LIMITS } from "@/lib/eva/intelligence/intelligence-constants";
import { PROJECT_SUMMARY_LIMITS } from "@/lib/eva/projects/summary-constants";
import { refineWorkflowEvaluationWithIntelligence } from "./workflow-intelligence";

/** Subset passed to workflow refinement (no circular ref to full context). */
export type ProjectIntelligenceSignals = {
  preferredDirectionLabel: string | null;
  preferredPathItemTitles: string[];
  acceptedConstraints: string[];
  supplementaryOpenItems: string[];
  comparisonPathCount: number;
  highlightedArtifacts: Array<{ id: string; title: string; fileType: string }>;
  shortlistPrimaryNames: string[];
};

/**
 * Normalized, reusable snapshot of real project state for ranking, prompts,
 * and workflow layering — assembled in one place (not per route).
 */
export type ProjectIntelligenceContext = ProjectIntelligenceSignals & {
  projectId: string;
  title: string;
  room: string;
  /** Trimmed description excerpt */
  goalExcerpt: string;
  workflowStage: WorkflowStageId;
  budgetCents: number;
  currency: string;
  decisionNotes: string | null;
  preferredPathNotes: string | null;
  briefLines: { key: string; value: string }[];
  favoriteArtifactIds: string[];
  recommendationsSnapshotSummary: {
    capturedAt: string | null;
    conversationId: string | null;
    topItemTitles: string[];
  };
  /** Product names on the project shortlist (deduped, for diversity scoring). */
  shortlistProductNames: string[];
  /** Last user + assistant snippets from the active conversation (bounded). */
  recentConversationExcerpt: string | null;
  workflowEvaluation: WorkflowEvaluation;
  builtAt: string;
};

export type BuildProjectIntelligenceContextOptions = {
  userMessage: string;
  messageCount: number;
  preferences: Record<string, string>;
};

/**
 * Builds workflow + ranking signals from parsed decision state and artifact/shortlist picks.
 * Used here and in `buildProjectSummary` so refinement logic stays aligned.
 */
export function buildProjectIntelligenceSignals(input: {
  decision: ProjectDecisionContext | null;
  highlightedArtifacts: Array<{ id: string; title: string; fileType: string }>;
  shortlistPrimaryNames: string[];
}): ProjectIntelligenceSignals {
  const preferred = input.decision?.preferredPath;
  return {
    preferredDirectionLabel: preferred?.label?.trim() ?? null,
    preferredPathItemTitles:
      preferred?.items?.map((i) => i.title.trim()).filter(Boolean) ?? [],
    acceptedConstraints: input.decision?.acceptedConstraints ?? [],
    supplementaryOpenItems:
      input.decision?.supplementaryOpenItems
        ?.map((s) => s.trim())
        .filter(Boolean) ?? [],
    comparisonPathCount: input.decision?.comparisonCandidates?.length ?? 0,
    highlightedArtifacts: input.highlightedArtifacts,
    shortlistPrimaryNames: input.shortlistPrimaryNames,
  };
}

async function lastConversationExcerpt(
  db: PrismaClient,
  conversationId: string | null,
): Promise<string | null> {
  if (!conversationId) return null;
  const rows = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: INTELLIGENCE_LIMITS.recentChatMessagesTake,
    select: { role: true, content: true },
  });
  if (rows.length === 0) return null;
  const preview = INTELLIGENCE_LIMITS.recentChatMessagePreviewChars;
  const maxTotal = INTELLIGENCE_LIMITS.recentChatExcerptMaxChars;
  const parts = [...rows].reverse().map((m) => {
    const role = m.role === "user" ? "User" : "Assistant";
    const raw = m.content ?? "";
    const text = raw.trim().slice(0, preview);
    return `${role}: ${text}${raw.length > preview ? "…" : ""}`;
  });
  const joined = parts.join("\n");
  return joined.length > maxTotal ? `${joined.slice(0, maxTotal)}…` : joined;
}

export async function buildProjectIntelligenceContext(
  db: PrismaClient,
  projectId: string,
  opts: BuildProjectIntelligenceContextOptions,
): Promise<ProjectIntelligenceContext | null> {
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      shortlistItems: {
        orderBy: { updatedAt: "desc" },
        take: PROJECT_SUMMARY_LIMITS.maxShortlistRows,
        select: {
          productName: true,
          status: true,
        },
      },
    },
  });
  if (!p) return null;

  const prefs =
    Object.keys(opts.preferences).length > 0
      ? opts.preferences
      : p.activeConversationId
        ? await getPreferencesAsRecord(db, p.activeConversationId)
        : {};

  const decision = parseDecisionContext(p.decisionContext);
  const snap = parseRecommendationsSnapshot(p.recommendationsSnapshot);

  const rawEval = evaluateProjectWorkflow({
    workflowStage: p.workflowStage,
    project: {
      title: p.title,
      room: p.room,
      description: p.description,
      budgetCents: p.budgetCents,
      briefSnapshot: p.briefSnapshot,
      workflowSatisfied: p.workflowSatisfied,
    },
    preferences: prefs,
    messageCount: opts.messageCount,
    userMessage: opts.userMessage,
  });

  const workflowStage: WorkflowStageId = isWorkflowStageId(p.workflowStage)
    ? p.workflowStage
    : "intake";

  const preferredPathNotes = decision?.preferredPath?.notes?.trim() || null;

  const artifacts = await listProjectArtifacts(db, projectId);
  const favIds = new Set(decision?.favoriteArtifactIds ?? []);
  const highlighted = orderArtifactsFavoritesFirst(
    artifacts,
    favIds,
    PROJECT_SUMMARY_LIMITS.summaryRankedItemCap,
  );

  const highlightedArtifacts = highlighted.map((a) => ({
    id: a.id,
    title: a.title,
    fileType: a.fileType,
  }));

  const topSnapTitles =
    snap?.items
      ?.slice(0, PROJECT_SUMMARY_LIMITS.summaryRankedItemCap)
      .map((i) => i.title.trim())
      .filter(Boolean) ?? [];

  const shortlistNames = [
    ...new Set(
      p.shortlistItems.map((s) => s.productName.trim()).filter(Boolean),
    ),
  ];
  const shortlistPrimaryNames = p.shortlistItems
    .filter((s) => s.status === "primary")
    .map((s) => s.productName.trim())
    .filter(Boolean);

  const signals = buildProjectIntelligenceSignals({
    decision,
    highlightedArtifacts,
    shortlistPrimaryNames,
  });

  const workflowEvaluation = refineWorkflowEvaluationWithIntelligence(
    rawEval,
    signals,
    { userMessage: opts.userMessage },
  );

  const goalExcerpt =
    p.description
      .trim()
      .slice(0, PROJECT_SUMMARY_LIMITS.goalDescriptionMaxChars) +
    (p.description.length > PROJECT_SUMMARY_LIMITS.goalDescriptionMaxChars
      ? "…"
      : "");

  const recentConversationExcerpt = await lastConversationExcerpt(
    db,
    p.activeConversationId,
  );

  return {
    ...signals,
    projectId: p.id,
    title: p.title,
    room: p.room,
    goalExcerpt,
    workflowStage,
    budgetCents: p.budgetCents,
    currency: p.currency,
    decisionNotes: decision?.decisionNotes?.trim() || null,
    preferredPathNotes,
    briefLines: parseBriefSnapshotEntries(p.briefSnapshot),
    favoriteArtifactIds: [...favIds],
    recommendationsSnapshotSummary: {
      capturedAt: snap?.capturedAt ?? null,
      conversationId: snap?.conversationId ?? null,
      topItemTitles: topSnapTitles,
    },
    shortlistProductNames: shortlistNames,
    recentConversationExcerpt,
    workflowEvaluation,
    builtAt: new Date().toISOString(),
  };
}
