import { envInt } from "@/server/env";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";

function messagesPerMinuteLimit(): number {
  return envInt("CHAT_USER_MESSAGES_PER_MINUTE", 20);
}

function messagesPerDayLimit(): number {
  return envInt("CHAT_USER_MESSAGES_PER_DAY", 200);
}

function extractionPerMinuteLimit(): number {
  return envInt("CHAT_EXTRACTION_PER_MINUTE", 30);
}

function startOfUtcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function oneMinuteAgo(now = new Date()): Date {
  return new Date(now.getTime() - 60_000);
}

type ChatRateLimitError = "rate_limited" | "daily_limit";

/**
 * Atomic per-user message quotas before claiming a generation.
 * Cost caps live in `cost-guard` (CostLog) — this module is message counts only.
 * Serializes on the user row.
 */
export async function assertChatSendAllowed(input: {
  userId: string;
}): Promise<ServiceResult<true, ChatRateLimitError>> {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { updatedAt: new Date() },
    });

    const now = new Date();
    const minuteAgo = oneMinuteAgo(now);
    const dayStart = startOfUtcDay(now);

    const [minuteCount, dayCount] = await Promise.all([
      tx.message.count({
        where: {
          role: "user",
          createdAt: { gte: minuteAgo },
          conversation: { userId: input.userId },
        },
      }),
      tx.message.count({
        where: {
          role: "user",
          createdAt: { gte: dayStart },
          conversation: { userId: input.userId },
        },
      }),
    ]);

    const perMinute = messagesPerMinuteLimit();
    if (perMinute > 0 && minuteCount >= perMinute) {
      return err(
        "rate_limited",
        "You are sending messages too quickly. Please wait a moment.",
      );
    }

    const perDay = messagesPerDayLimit();
    if (perDay > 0 && dayCount >= perDay) {
      return err(
        "daily_limit",
        "You have reached today's chat message limit. Try again tomorrow.",
      );
    }

    return ok(true as const);
  });
}

/**
 * Soft throttle for preference extraction persistence volume.
 * Does not block the chat reply when exceeded — caller should skip proposals.
 */
export async function canPersistPreferenceExtractions(input: {
  userId: string;
}): Promise<boolean> {
  const limit = extractionPerMinuteLimit();
  if (limit <= 0) return true;
  const count = await prisma.preferenceProposal.count({
    where: {
      userId: input.userId,
      createdAt: { gte: oneMinuteAgo() },
    },
  });
  return count < limit;
}
