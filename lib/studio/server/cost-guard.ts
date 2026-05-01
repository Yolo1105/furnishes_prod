import "server-only";

import { prisma } from "@/lib/eva/db";

export type RecordCostInput = {
  actualUsd: number;
  model: string;
  route: string;
};

/**
 * Soft daily cap for Studio-paid routes (aggregates existing CostLog rows
 * for this user's conversations). Placeholder `recordCost` is a no-op until
 * Studio routes attach real model spend to CostLog with a conversationId.
 */
export async function studioCostGuard(args: {
  userId: string;
  estimatedUsd: number;
}): Promise<
  | { ok: true; recordCost: (input: RecordCostInput) => Promise<void> }
  | { ok: false; response: Response }
> {
  const cap = Number(process.env.STUDIO_USER_DAILY_COST_LIMIT_USD ?? "5");
  if (!Number.isFinite(cap) || cap <= 0) {
    return {
      ok: true,
      recordCost: async () => {},
    };
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const agg = await prisma.costLog.aggregate({
    _sum: { costUsd: true },
    where: {
      createdAt: { gte: since },
      conversation: { userId: args.userId },
    },
  });
  const spent = agg._sum.costUsd ?? 0;
  if (spent + args.estimatedUsd > cap) {
    return {
      ok: false,
      response: Response.json(
        { error: "Daily studio spend limit exceeded" },
        { status: 429 },
      ),
    };
  }
  return {
    ok: true,
    recordCost: async () => {},
  };
}
