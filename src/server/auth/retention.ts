import { envInt } from "@/server/env";
import { prisma } from "@/server/db";

function cutoffDays(days: number, now: Date): Date | null {
  if (days <= 0) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function securityEventRetentionDays(): number {
  return envInt("SECURITY_EVENT_RETENTION_DAYS", 90);
}

export function authRateLimitRetentionDays(): number {
  return envInt("AUTH_RATE_LIMIT_RETENTION_DAYS", 7);
}

function costLogRetentionDays(): number {
  return envInt("COST_LOG_RETENTION_DAYS", 90);
}

function implicitSignalRetentionDays(): number {
  return envInt("IMPLICIT_SIGNAL_RETENTION_DAYS", 90);
}

function chatGenerationRetentionDays(): number {
  return envInt("CHAT_GENERATION_RETENTION_DAYS", 90);
}

function workflowEventRetentionDays(): number {
  return envInt("WORKFLOW_EVENT_RETENTION_DAYS", 90);
}

type RetentionPurgeResult = {
  securityEvents: number;
  sessions: number;
  emailTokens: number;
  authRateLimits: number;
  costLogs: number;
  implicitSignals: number;
  chatGenerations: number;
  workflowEvents: number;
};

/**
 * Deletes expired auth material, aged security events, and high-growth
 * operational tables past their retention windows.
 * Safe to run repeatedly (cron / ops script).
 */
export async function purgeRetention(
  now = new Date(),
): Promise<RetentionPurgeResult> {
  const eventCutoff = cutoffDays(securityEventRetentionDays(), now);
  const rateCutoff = cutoffDays(authRateLimitRetentionDays(), now);
  const costCutoff = cutoffDays(costLogRetentionDays(), now);
  const signalCutoff = cutoffDays(implicitSignalRetentionDays(), now);
  const generationCutoff = cutoffDays(chatGenerationRetentionDays(), now);
  const workflowCutoff = cutoffDays(workflowEventRetentionDays(), now);

  const [
    securityEvents,
    sessions,
    emailTokens,
    authRateLimits,
    costLogs,
    implicitSignals,
    chatGenerations,
    workflowEvents,
  ] = await Promise.all([
    eventCutoff
      ? prisma.securityEvent.deleteMany({
          where: { createdAt: { lt: eventCutoff } },
        })
      : Promise.resolve({ count: 0 }),
    prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null, lt: now } }],
      },
    }),
    prisma.emailToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
    rateCutoff
      ? prisma.authRateLimit.deleteMany({
          where: { windowStart: { lt: rateCutoff } },
        })
      : Promise.resolve({ count: 0 }),
    costCutoff
      ? prisma.costLog.deleteMany({ where: { createdAt: { lt: costCutoff } } })
      : Promise.resolve({ count: 0 }),
    signalCutoff
      ? prisma.implicitSignal.deleteMany({
          where: { createdAt: { lt: signalCutoff } },
        })
      : Promise.resolve({ count: 0 }),
    generationCutoff
      ? prisma.chatGeneration.deleteMany({
          where: { startedAt: { lt: generationCutoff } },
        })
      : Promise.resolve({ count: 0 }),
    workflowCutoff
      ? prisma.workflowEvent.deleteMany({
          where: { createdAt: { lt: workflowCutoff } },
        })
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    securityEvents: securityEvents.count,
    sessions: sessions.count,
    emailTokens: emailTokens.count,
    authRateLimits: authRateLimits.count,
    costLogs: costLogs.count,
    implicitSignals: implicitSignals.count,
    chatGenerations: chatGenerations.count,
    workflowEvents: workflowEvents.count,
  };
}
