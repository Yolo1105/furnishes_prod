/**
 * LLM cost persistence and spend caps (single ledger authority).
 * Re-derived from legacy `lib/eva/core/cost-tracker.ts` + `cost-logger.ts`.
 *
 * Caps (all against CostLog; 0 disables that check):
 * - session: per-conversation (`CHAT_SESSION_COST_LIMIT_USD`, default 2)
 * - per-user UTC day (`CHAT_USER_DAILY_COST_LIMIT_USD`, alias `CHAT_USER_DAILY_COST_USD`, default 5)
 * - global UTC day (`CHAT_GLOBAL_DAILY_COST_LIMIT_USD`, default 100)
 *
 * `ChatGeneration.costUsd` is telemetry only — never used for caps.
 */

import { prisma } from "@/server/db";
import { logOps } from "@/server/ops/log";
import {
  computeChatCostUsd,
  toChatUsageLike,
} from "@/server/conversations/chat-telemetry";

/** Warn when conversation spend reaches this fraction of the session limit. */
const SESSION_COST_WARNING_RATIO = 0.8;

type CostKind =
  | "chat"
  | "extraction"
  | "embedding"
  | "vision"
  | "recommendation"
  | "suggestion"
  | "brainstorm"
  | "insight"
  | "brief"
  | "image";

export type { CostKind };

type CostUsageInput = {
  promptTokens?: number | null;
  completionTokens?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export type CostGuardDeps = {
  getSessionCostUsd: (conversationId: string) => Promise<number>;
  getDailyUserCostUsd: (userId: string, now?: Date) => Promise<number>;
  getDailyGlobalCostUsd: (now?: Date) => Promise<number>;
};

function sessionCostLimitUsd(): number {
  const raw = Number(process.env.CHAT_SESSION_COST_LIMIT_USD ?? "2");
  return Number.isFinite(raw) && raw >= 0 ? raw : 2;
}

/**
 * Per-user UTC-day cap. Prefers `CHAT_USER_DAILY_COST_LIMIT_USD`;
 * falls back to legacy alias `CHAT_USER_DAILY_COST_USD`.
 */
function userDailyCostLimitUsd(): number {
  const primary = process.env.CHAT_USER_DAILY_COST_LIMIT_USD;
  const alias = process.env.CHAT_USER_DAILY_COST_USD;
  const raw = Number(primary ?? alias ?? "5");
  return Number.isFinite(raw) && raw >= 0 ? raw : 5;
}

function globalDailyCostLimitUsd(): number {
  const raw = Number(process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD ?? "100");
  return Number.isFinite(raw) && raw >= 0 ? raw : 100;
}

function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && "toNumber" in value) {
    const toNumber = (value as { toNumber?: () => number }).toNumber;
    if (typeof toNumber === "function") {
      const n = toNumber.call(value);
      return Number.isFinite(n) ? n : 0;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function startOfUtcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

async function getSessionCostUsd(conversationId: string): Promise<number> {
  const result = await prisma.costLog.aggregate({
    where: { conversationId },
    _sum: { costUsd: true },
  });
  return decimalToNumber(result._sum.costUsd);
}

/** Total CostLog spend for one user since UTC midnight. */
async function getDailyUserCostUsd(
  userId: string,
  now = new Date(),
): Promise<number> {
  const result = await prisma.costLog.aggregate({
    where: { userId, createdAt: { gte: startOfUtcDay(now) } },
    _sum: { costUsd: true },
  });
  return decimalToNumber(result._sum.costUsd);
}

/** Total CostLog spend since UTC midnight (all users). */
async function getDailyGlobalCostUsd(now = new Date()): Promise<number> {
  const result = await prisma.costLog.aggregate({
    where: { createdAt: { gte: startOfUtcDay(now) } },
    _sum: { costUsd: true },
  });
  return decimalToNumber(result._sum.costUsd);
}

/** Per-kind CostLog spend since UTC midnight (all users). */
async function getDailyCostByKind(
  now = new Date(),
): Promise<Record<string, number>> {
  const rows = await prisma.costLog.groupBy({
    by: ["kind"],
    where: { createdAt: { gte: startOfUtcDay(now) } },
    _sum: { costUsd: true },
  });
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.kind] = decimalToNumber(row._sum.costUsd);
  }
  return out;
}

const defaultDeps: CostGuardDeps = {
  getSessionCostUsd,
  getDailyUserCostUsd,
  getDailyGlobalCostUsd,
};

export async function recordCost(input: {
  userId: string;
  conversationId?: string | null;
  model: string;
  kind: CostKind;
  usage: CostUsageInput | unknown;
}): Promise<void> {
  const raw = (input.usage ?? {}) as Record<string, unknown>;
  const usage = toChatUsageLike({
    prompt_tokens:
      raw.promptTokens ??
      raw.prompt_tokens ??
      raw.inputTokens ??
      raw.input_tokens,
    completion_tokens:
      raw.completionTokens ??
      raw.completion_tokens ??
      raw.outputTokens ??
      raw.output_tokens,
  });
  const costUsd = computeChatCostUsd(usage, input.model);
  if (
    usage.promptTokens === 0 &&
    usage.completionTokens === 0 &&
    costUsd === 0
  ) {
    return;
  }

  await prisma.costLog.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId ?? null,
      model: input.model,
      kind: input.kind,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      costUsd,
    },
  });
}

/**
 * Persist spend, then re-check caps. Concurrent turns can still overshoot by
 * one call each (check-then-spend); subsequent turns are blocked by CostLog.
 * Logs `cost_soft_block` when the post-record check fails.
 */
export async function recordCostAndRecheck(
  input: {
    userId: string;
    conversationId?: string | null;
    model: string;
    kind: CostKind;
    usage: CostUsageInput | unknown;
  },
  deps: CostGuardDeps = defaultDeps,
): Promise<{ overshot: boolean }> {
  await recordCost(input);
  const allowance = await checkCostAllowance(
    {
      userId: input.userId,
      ...(input.conversationId != null
        ? { conversationId: input.conversationId }
        : {}),
    },
    deps,
  );
  if (!allowance.allowed) {
    logOps("warn", "cost_soft_block", {
      userId: input.userId,
      conversationId: input.conversationId ?? null,
      kind: input.kind,
      sessionCostUsd: allowance.sessionCostUsd,
      userCostUsd: allowance.userCostUsd,
      globalCostUsd: allowance.globalCostUsd,
    });
    return { overshot: true };
  }
  return { overshot: false };
}

type CostAllowance = {
  allowed: boolean;
  warning: boolean;
  sessionCostUsd: number;
  sessionLimitUsd: number;
  userCostUsd: number;
  userLimitUsd: number;
  globalCostUsd: number;
  globalLimitUsd: number;
};

/**
 * Session + per-user UTC-day + global UTC-day caps against CostLog.
 * Any limit env set to `0` disables that check.
 * When `conversationId` is omitted, the session check is skipped.
 */
export async function checkCostAllowance(
  input: { userId: string; conversationId?: string | null },
  deps: CostGuardDeps = defaultDeps,
): Promise<CostAllowance> {
  const sessionLimitUsd = sessionCostLimitUsd();
  const userLimitUsd = userDailyCostLimitUsd();
  const globalLimitUsd = globalDailyCostLimitUsd();

  const [sessionCostUsd, userCostUsd, globalCostUsd] = await Promise.all([
    input.conversationId
      ? deps.getSessionCostUsd(input.conversationId)
      : Promise.resolve(0),
    deps.getDailyUserCostUsd(input.userId),
    deps.getDailyGlobalCostUsd(),
  ]);

  const sessionBlocked =
    sessionLimitUsd > 0 &&
    Boolean(input.conversationId) &&
    sessionCostUsd >= sessionLimitUsd;
  const userBlocked = userLimitUsd > 0 && userCostUsd >= userLimitUsd;
  const globalBlocked = globalLimitUsd > 0 && globalCostUsd >= globalLimitUsd;
  const warning =
    Boolean(input.conversationId) &&
    sessionLimitUsd > 0 &&
    sessionCostUsd >= sessionLimitUsd * SESSION_COST_WARNING_RATIO;

  return {
    allowed: !sessionBlocked && !userBlocked && !globalBlocked,
    warning,
    sessionCostUsd,
    sessionLimitUsd,
    userCostUsd,
    userLimitUsd,
    globalCostUsd,
    globalLimitUsd,
  };
}

/** `[ops]` helper — daily rollup of CostLog spend (no message content). */
export async function logDailyCostRollup(
  now = new Date(),
  deps: Pick<CostGuardDeps, "getDailyGlobalCostUsd"> & {
    getDailyPromptCacheStats?: () => Promise<{
      promptTokens: number;
      cachedTokens: number;
    }>;
    getDailyCostByKind?: (now?: Date) => Promise<Record<string, number>>;
  } = {
    ...defaultDeps,
    getDailyCostByKind,
  },
): Promise<{
  costUsd: number;
  dayStartIso: string;
  cacheHitRatio: number | null;
  costByKind: Record<string, number>;
}> {
  const dayStart = startOfUtcDay(now);
  const [costUsd, costByKind] = await Promise.all([
    deps.getDailyGlobalCostUsd(now),
    deps.getDailyCostByKind
      ? deps.getDailyCostByKind(now)
      : Promise.resolve({} as Record<string, number>),
  ]);
  let cacheHitRatio: number | null = null;
  if (deps.getDailyPromptCacheStats) {
    const stats = await deps.getDailyPromptCacheStats();
    if (stats.promptTokens > 0) {
      cacheHitRatio =
        Math.round((stats.cachedTokens / stats.promptTokens) * 1000) / 1000;
    }
  }
  logOps("info", "cost_daily_rollup", {
    costUsd,
    dayStartIso: dayStart.toISOString(),
    sessionLimitUsd: sessionCostLimitUsd(),
    userLimitUsd: userDailyCostLimitUsd(),
    globalLimitUsd: globalDailyCostLimitUsd(),
    cacheHitRatio,
    costByKindJson: JSON.stringify(costByKind),
  });
  return {
    costUsd,
    dayStartIso: dayStart.toISOString(),
    cacheHitRatio,
    costByKind,
  };
}
