import { prisma } from "./db";

export type CostCategory = "chat" | "auxiliary";

export async function recordCost(
  conversationId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  costUsd: number,
  category: CostCategory = "chat",
): Promise<void> {
  await prisma.costLog.create({
    data: {
      conversationId,
      model,
      promptTokens,
      completionTokens,
      costUsd,
      category,
    },
  });
}

/** Total cost for a conversation (all categories). */
export async function getSessionCost(conversationId: string): Promise<number> {
  const result = await prisma.costLog.aggregate({
    where: { conversationId },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd ?? 0;
}

/** Cost for a conversation filtered to "chat" category only. */
export async function getSessionChatCost(
  conversationId: string,
): Promise<number> {
  const result = await prisma.costLog.aggregate({
    where: { conversationId, category: "chat" },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd ?? 0;
}

/** Total LLM spend across all conversations since UTC midnight (CostLog). */
export async function getDailyGlobalCost(): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const result = await prisma.costLog.aggregate({
    where: { createdAt: { gte: start } },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd ?? 0;
}
