import { prisma } from "@/server/db";
import type { RecommendationItem } from "./ranking";

type DesignRecommendationRow = {
  id: string;
  conversationId: string;
  stableId: string;
  payload: unknown;
  rank: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listActiveRecommendations(
  conversationId: string,
): Promise<DesignRecommendationRow[]> {
  return prisma.designRecommendation.findMany({
    where: { conversationId, status: "active" },
    orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
  });
}

export async function upsertRecommendationRows(input: {
  conversationId: string;
  items: RecommendationItem[];
}): Promise<DesignRecommendationRow[]> {
  if (input.items.length === 0) return [];
  return prisma.$transaction(
    input.items.map((item) => {
      const payload = {
        title: item.title,
        category: item.category,
        summary: item.summary,
        rationale: item.reasonWhyItFits,
        specs: item.specs ?? [],
        priceBandUsd: item.priceBandUsd ?? null,
        estimatedPrice: item.estimatedPrice,
        alternatives: item.alternatives ?? [],
        relatedPreferences: item.relatedPreferences,
        discussionPrompt: item.discussionPrompt,
        explanationFactors: item.explanationFactors ?? [],
        fitScore: item.fitScore ?? null,
      };
      return prisma.designRecommendation.upsert({
        where: {
          conversationId_stableId: {
            conversationId: input.conversationId,
            stableId: item.id,
          },
        },
        create: {
          conversationId: input.conversationId,
          stableId: item.id,
          payload,
          rank: item.rank,
          status: "active",
        },
        update: {
          payload,
          rank: item.rank,
          status: "active",
        },
      });
    }),
  );
}

export async function findRecommendationForUser(input: {
  userId: string;
  conversationId: string;
  stableId: string;
}): Promise<DesignRecommendationRow | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: { id: true },
  });
  if (!conversation) return null;
  return prisma.designRecommendation.findUnique({
    where: {
      conversationId_stableId: {
        conversationId: input.conversationId,
        stableId: input.stableId,
      },
    },
  });
}

export async function markRecommendationSaved(input: {
  conversationId: string;
  stableId: string;
}): Promise<void> {
  await prisma.designRecommendation.update({
    where: {
      conversationId_stableId: {
        conversationId: input.conversationId,
        stableId: input.stableId,
      },
    },
    data: { status: "saved" },
  });
}
