import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";

const ACTIVE = ["queued", "generating"] as const;

function dailyLimit(): number {
  const raw = Number(process.env.IMAGE_GENERATION_DAILY_LIMIT ?? 20);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 20;
}

function concurrentLimit(): number {
  const raw = Number(process.env.IMAGE_GENERATION_MAX_CONCURRENT_PER_USER ?? 2);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2;
}

function startOfUtcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Atomically checks daily + concurrent quotas and creates a queued generation.
 * A write lock on the user row serializes concurrent create attempts (SQLite).
 */
export async function reserveGenerationSlot(input: {
  userId: string;
  projectId: string | null;
  prompt: string;
  negativePrompt: string | null;
  provider: string;
  width: number;
  height: number;
}): Promise<
  ServiceResult<{ id: string }, "rate_limited" | "concurrency_limit">
> {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { updatedAt: new Date() },
    });

    const dayStart = startOfUtcDay();
    const [todayCount, activeCount] = await Promise.all([
      tx.imageGeneration.count({
        where: { userId: input.userId, createdAt: { gte: dayStart } },
      }),
      tx.imageGeneration.count({
        where: {
          userId: input.userId,
          status: { in: [...ACTIVE] },
        },
      }),
    ]);

    if (todayCount >= dailyLimit()) {
      return err("rate_limited", "Daily image generation limit reached.");
    }
    if (activeCount >= concurrentLimit()) {
      return err(
        "concurrency_limit",
        "Wait for an in-progress generation to finish.",
      );
    }

    const generation = await tx.imageGeneration.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        status: "queued",
        provider: input.provider,
        width: input.width,
        height: input.height,
      },
      select: { id: true },
    });

    return ok(generation);
  });
}

export async function countGenerationsToday(userId: string): Promise<number> {
  return prisma.imageGeneration.count({
    where: { userId, createdAt: { gte: startOfUtcDay() } },
  });
}
