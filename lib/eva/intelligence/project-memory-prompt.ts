import { INTELLIGENCE_LIMITS } from "@/lib/eva/intelligence/intelligence-constants";
import type { ProjectIntelligenceContext } from "./project-intelligence-context";

export type ProjectMemoryPromptKind = "chat" | "recommendations";

const PROMPT_COPY: Record<
  ProjectMemoryPromptKind,
  { headline: string; instruction: string }
> = {
  chat: {
    headline: "PROJECT CONTEXT — ground truth for this thread",
    instruction:
      "Use this JSON when it clarifies constraints; do not invent facts not listed. Weave it in with short natural bridges (“since you wanted…”, “with the budget you mentioned…”)—not as a table read, field dump, or JSON quote. Do not reopen settled choices unless something new conflicts.",
  },
  recommendations: {
    headline: "PROJECT CONTEXT — rank and explain recommendations against this",
    instruction:
      "Use this JSON as ground truth alongside preferences. Tie reasons to constraints, preferred direction, and highlighted files when applicable. Talk through picks like a designer: short contrasts (safer vs bolder, practical vs expressive, primary pick vs backup)—avoid score matrices, rank tables, or internal IDs in user-facing wording unless they ask for criteria.",
  },
};

function buildMemoryPayload(ctx: ProjectIntelligenceContext) {
  const L = INTELLIGENCE_LIMITS;
  const snap = ctx.recommendationsSnapshotSummary;
  return {
    projectTitle: ctx.title,
    room: ctx.room,
    workflowStage: ctx.workflowStage,
    goalExcerpt: ctx.goalExcerpt,
    budgetCents: ctx.budgetCents,
    currency: ctx.currency,
    briefLines: ctx.briefLines.slice(0, L.promptBriefLineMax),
    decisionNotes: ctx.decisionNotes,
    preferredDirection: ctx.preferredDirectionLabel
      ? {
          label: ctx.preferredDirectionLabel,
          notes: ctx.preferredPathNotes,
          itemTitles: ctx.preferredPathItemTitles.slice(
            0,
            L.promptPreferredPathTitlesMax,
          ),
        }
      : null,
    acceptedConstraints: ctx.acceptedConstraints.slice(
      0,
      L.promptConstraintsMax,
    ),
    supplementaryOpenItems: ctx.supplementaryOpenItems.slice(
      0,
      L.promptSupplementaryOpenMax,
    ),
    comparisonPathsCount: ctx.comparisonPathCount,
    highlightedArtifacts: ctx.highlightedArtifacts.map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.fileType,
    })),
    recommendationsSnapshot: {
      capturedAt: snap.capturedAt,
      topPriorTitles: snap.topItemTitles.slice(0, L.promptSnapshotTitlesMax),
    },
    shortlistProductNamesSample: ctx.shortlistProductNames.slice(
      0,
      L.promptShortlistNamesSampleMax,
    ),
    recentConversationExcerpt: ctx.recentConversationExcerpt,
  };
}

/** Structured JSON block for chat or recommendation prompts — single payload builder. */
export function formatProjectMemoryPrompt(
  ctx: ProjectIntelligenceContext,
  kind: ProjectMemoryPromptKind,
): string {
  const { headline, instruction } = PROMPT_COPY[kind];
  const payload = buildMemoryPayload(ctx);
  return `[${headline}]
${instruction}

${JSON.stringify(payload, null, 0)}`;
}

export function formatProjectMemoryForSystemPrompt(
  ctx: ProjectIntelligenceContext,
): string {
  return formatProjectMemoryPrompt(ctx, "chat");
}

export function formatProjectIntelligenceForRecommendationsPrompt(
  ctx: ProjectIntelligenceContext,
): string {
  return formatProjectMemoryPrompt(ctx, "recommendations");
}
