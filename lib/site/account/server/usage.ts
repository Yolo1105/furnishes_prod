import "server-only";

import { prisma } from "@/lib/db/prisma";

/** Until subscription is modeled in DB, optional display label for dashboard usage card. */
export function accountDashboardPlanLabel(): "FREE" | "PRO" | "STUDIO+" {
  const p = process.env.ACCOUNT_DISPLAY_PLAN?.trim().toUpperCase();
  if (p === "PRO" || p === "STUDIO+") return p;
  return "FREE";
}

/**
 * Display cap for Eva token usage (prompt + completion) on dashboard/billing.
 * Override with `ACCOUNT_EVA_TOKEN_DISPLAY_LIMIT` (positive integer).
 */
/** Exported for degraded dashboard path when CostLog aggregate cannot run. */
export function evaTokenDisplayLimit(): number {
  const raw = process.env.ACCOUNT_EVA_TOKEN_DISPLAY_LIMIT?.trim();
  if (!raw) return 1_000_000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1_000_000;
}

/** Aggregate CostLog across all conversations owned by the user. */
export async function getAccountTokenUsage(userId: string): Promise<{
  used: number;
  limit: number;
}> {
  const tokenAgg = await prisma.costLog.aggregate({
    where: { conversation: { userId } },
    _sum: { promptTokens: true, completionTokens: true },
  });
  const used =
    (tokenAgg._sum.promptTokens ?? 0) + (tokenAgg._sum.completionTokens ?? 0);
  return { used, limit: evaTokenDisplayLimit() };
}
