import type { ProjectMemoryContext } from "./project-memory";

type ProjectMemoryPromptKind = "chat" | "recommendations";

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
      "Use this JSON as ground truth alongside preferences. Tie reasons to constraints, timeline events, and sibling thread summaries when applicable. Talk through picks like a designer: short contrasts (safer vs bolder, practical vs expressive)—avoid score matrices, rank tables, or internal IDs in user-facing wording unless they ask for criteria.",
  },
};

function buildMemoryPayload(ctx: ProjectMemoryContext) {
  return {
    projectId: ctx.projectId,
    projectName: ctx.name,
    projectSummary: ctx.summary,
    confirmedPreferences: ctx.confirmedPreferences,
    roomDimensions: ctx.roomDimensions,
    recentTimeline: ctx.timelineEvents.map((event) => ({
      kind: event.kind,
      summary: event.summary,
    })),
    designRecommendations: ctx.recommendations.map((item) => ({
      title: item.title,
      category: item.category,
      conversationId: item.conversationId,
      rank: item.rank,
    })),
    siblingThreads: ctx.siblingThreads.map((thread) => ({
      conversationId: thread.conversationId,
      title: thread.title,
      workflowStage: thread.workflowStage,
      contextSummaryExcerpt: thread.contextSummaryExcerpt,
    })),
    builtAt: ctx.builtAt,
  };
}

export function formatProjectMemoryPrompt(
  ctx: ProjectMemoryContext,
  kind: ProjectMemoryPromptKind,
): string {
  const { headline, instruction } = PROMPT_COPY[kind];
  const payload = buildMemoryPayload(ctx);
  return `[${headline}]
${instruction}

${JSON.stringify(payload, null, 0)}`;
}
