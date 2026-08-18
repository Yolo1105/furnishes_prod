/**
 * Project-scoped memory for chat and recommendations prompts.
 * Never includes raw message text — summaries and structured facts only.
 */

import { prisma } from "@/server/db";
import { getConfirmedPreferenceMap } from "@/server/preferences/preference-service";
import type { ChatPreferenceCategory } from "@/server/preferences/preference-types";

export const MEMORY_LIMITS = {
  timelineEvents: 5,
  recommendations: 5,
  siblingSummaries: 3,
  siblingSummaryMaxChars: 400,
  recommendationTitleMaxChars: 120,
  projectSummaryMaxChars: 600,
} as const;

export type ProjectMemoryContext = {
  projectId: string;
  name: string;
  summary: string | null;
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  roomDimensions: unknown | null;
  timelineEvents: Array<{ kind: string; summary: string; createdAt: string }>;
  recommendations: Array<{
    title: string;
    category: string;
    conversationId: string;
    rank: number;
  }>;
  siblingThreads: Array<{
    conversationId: string;
    title: string;
    workflowStage: string;
    contextSummaryExcerpt: string;
  }>;
  builtAt: string;
};

function truncate(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1)}…`;
}

function recommendationTitle(payload: unknown): string {
  const row = (payload ?? {}) as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  return title || "Recommendation";
}

function recommendationCategory(payload: unknown): string {
  const row = (payload ?? {}) as Record<string, unknown>;
  return typeof row.category === "string" ? row.category : "general";
}

type ProjectMemorySourceData = {
  project: {
    id: string;
    name: string;
    summary: string | null;
  };
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  roomDimensions: unknown | null;
  timelineEvents: Array<{ kind: string; summary: string; createdAt: Date }>;
  recommendationRows: Array<{
    conversationId: string;
    rank: number;
    payload: unknown;
  }>;
  siblingConversations: Array<{
    id: string;
    title: string;
    workflowStage: string;
    contextSummary: string | null;
  }>;
};

/** Pure assembler — testable without Prisma. */
export function assembleProjectMemoryContext(
  data: ProjectMemorySourceData,
): ProjectMemoryContext {
  const L = MEMORY_LIMITS;
  return {
    projectId: data.project.id,
    name: data.project.name,
    summary: data.project.summary
      ? truncate(data.project.summary, L.projectSummaryMaxChars)
      : null,
    confirmedPreferences: data.confirmedPreferences,
    roomDimensions: data.roomDimensions,
    timelineEvents: data.timelineEvents
      .slice(0, L.timelineEvents)
      .map((event) => ({
        kind: event.kind,
        summary: event.summary,
        createdAt: event.createdAt.toISOString(),
      })),
    recommendations: data.recommendationRows
      .slice(0, L.recommendations)
      .map((row) => ({
        title: truncate(
          recommendationTitle(row.payload),
          L.recommendationTitleMaxChars,
        ),
        category: recommendationCategory(row.payload),
        conversationId: row.conversationId,
        rank: row.rank,
      })),
    // Prefer siblings that have a summary (skip null); cap at MEMORY_LIMITS.
    siblingThreads: data.siblingConversations
      .filter((conversation) => Boolean(conversation.contextSummary?.trim()))
      .slice(0, L.siblingSummaries)
      .map((conversation) => ({
        conversationId: conversation.id,
        title: conversation.title,
        workflowStage: conversation.workflowStage,
        contextSummaryExcerpt: truncate(
          conversation.contextSummary!.trim(),
          L.siblingSummaryMaxChars,
        ),
      })),
    builtAt: new Date().toISOString(),
  };
}

export function isChatProjectMemoryEnabled(): boolean {
  return process.env.CHAT_PROJECT_MEMORY_ENABLED === "1";
}

async function userOwnsProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return Boolean(project);
}

export async function buildProjectMemoryContext(input: {
  projectId: string;
  userId: string;
  /** Exclude the active thread from sibling summaries. */
  excludeConversationId?: string;
}): Promise<ProjectMemoryContext | null> {
  const authorized = await userOwnsProject(input.userId, input.projectId);
  if (!authorized) return null;

  const [project, confirmedPreferences, styleProfile, conversations] =
    await Promise.all([
      prisma.project.findUnique({
        where: { id: input.projectId },
        select: {
          id: true,
          name: true,
          summary: true,
          timeline: {
            orderBy: { createdAt: "desc" },
            take: MEMORY_LIMITS.timelineEvents,
            select: { kind: true, summary: true, createdAt: true },
          },
        },
      }),
      getConfirmedPreferenceMap(input.userId),
      prisma.styleProfile.findUnique({
        where: { userId: input.userId },
        select: { roomDimensions: true },
      }),
      prisma.conversation.findMany({
        where: {
          projectId: input.projectId,
          userId: input.userId,
          ...(input.excludeConversationId
            ? { id: { not: input.excludeConversationId } }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          workflowStage: true,
          contextSummary: true,
        },
      }),
    ]);

  if (!project) return null;

  const conversationIds = (
    await prisma.conversation.findMany({
      where: { projectId: input.projectId, userId: input.userId },
      select: { id: true },
    })
  ).map((conversation) => conversation.id);
  const recommendationRows =
    conversationIds.length > 0
      ? await prisma.designRecommendation.findMany({
          where: {
            conversationId: { in: conversationIds },
            status: { in: ["active", "saved"] },
          },
          orderBy: [{ conversationId: "asc" }, { rank: "asc" }],
          take: MEMORY_LIMITS.recommendations * 2,
          select: {
            conversationId: true,
            rank: true,
            payload: true,
          },
        })
      : [];

  // Prefer siblings with summaries when selecting the capped set.
  const siblingsPreferSummary = [
    ...conversations.filter((row) => Boolean(row.contextSummary?.trim())),
    ...conversations.filter((row) => !row.contextSummary?.trim()),
  ];

  return assembleProjectMemoryContext({
    project: {
      id: project.id,
      name: project.name,
      summary: project.summary,
    },
    confirmedPreferences,
    roomDimensions: styleProfile?.roomDimensions ?? null,
    timelineEvents: project.timeline,
    recommendationRows: recommendationRows.slice(
      0,
      MEMORY_LIMITS.recommendations,
    ),
    siblingConversations: siblingsPreferSummary,
  });
}
