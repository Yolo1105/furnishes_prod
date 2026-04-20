import { getDomainConfig } from "@/lib/eva/domain/config";

import { getDailyGlobalCost, getSessionCost } from "./cost-logger";

const DEFAULT_GLOBAL_DAILY_CAP_USD = 100;
/** Warn when total session LLM cost (chat + auxiliary) reaches this fraction of the limit. */
const SESSION_COST_WARNING_RATIO = 0.8;

export async function checkCostLimit(conversationId: string): Promise<{
  allowed: boolean;
  warning: boolean;
  currentCost: number;
  limit: number;
}> {
  const config = getDomainConfig();
  const limit = config.rate_limits?.session_cost_limit_usd ?? 2.0;
  const currentCost = await getSessionCost(conversationId);
  const warning = currentCost >= limit * SESSION_COST_WARNING_RATIO;
  return { allowed: currentCost < limit, warning, currentCost, limit };
}

/**
 * Caps aggregate OpenAI spend for the current UTC day (all conversations).
 * When `global_daily_cost_limit_usd` is `0` in domain.json, the check is skipped.
 */
export async function checkGlobalDailyCostLimit(): Promise<{
  allowed: boolean;
  currentCost: number;
  limit: number;
}> {
  const config = getDomainConfig();
  const raw = config.rate_limits?.global_daily_cost_limit_usd;
  if (raw === 0) {
    const currentCost = await getDailyGlobalCost();
    return { allowed: true, currentCost, limit: 0 };
  }
  const limit = raw ?? DEFAULT_GLOBAL_DAILY_CAP_USD;
  const currentCost = await getDailyGlobalCost();
  return { allowed: currentCost < limit, currentCost, limit };
}
