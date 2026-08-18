/**
 * Reconcile image generations that stopped making progress.
 *
 * Status normally advances only when the browser polls
 * `POST /api/account/image-generations/[id]/refresh`. A closed tab or a server
 * restart therefore leaves rows in `queued`/`generating` forever, and those rows
 * keep consuming the user's concurrency budget in `reserveGenerationSlot`.
 *
 * Safe to run repeatedly (cron / ops script).
 */

import { envInt } from "@/server/env";
import { prisma } from "@/server/db";
import { logOps } from "@/server/ops/log";
import { refreshImageGeneration } from "./image-generation-service";
import { isTerminalStatus } from "./image-generation-types";

const ACTIVE = ["queued", "generating"] as const;

/** Minutes without progress before a row is re-polled. */
function reconcileStaleMinutes(): number {
  return Math.max(
    1,
    envInt("IMAGE_GENERATION_RECONCILE_STALE_MINUTES", 3) || 3,
  );
}

/** Minutes after creation before a row is failed as abandoned. */
function reconcileAbandonMinutes(): number {
  return Math.max(1, envInt("IMAGE_GENERATION_ABANDON_MINUTES", 30) || 30);
}

/** Maximum rows handled per run. */
function reconcileBatchSize(): number {
  return envInt("IMAGE_GENERATION_RECONCILE_BATCH", 50);
}

type ReconcileResult = {
  examined: number;
  /** Reached a terminal status via a provider status check. */
  advanced: number;
  /** Failed locally as abandoned or orphaned. */
  abandoned: number;
  /** Still in progress, or the provider could not be reached. */
  unresolved: number;
};

/**
 * Marks a still-active row failed. The status filter keeps a concurrent
 * completion from being overwritten.
 */
async function failStuck(
  generationId: string,
  errorCode: string,
  errorMessage: string,
  now: Date,
): Promise<boolean> {
  const { count } = await prisma.imageGeneration.updateMany({
    where: { id: generationId, status: { in: [...ACTIVE] } },
    data: {
      status: "failed",
      errorCode,
      errorMessage,
      completedAt: now,
    },
  });
  return count > 0;
}

export async function reconcileStuckImageGenerations(
  now = new Date(),
): Promise<ReconcileResult> {
  const staleCutoff = new Date(
    now.getTime() - reconcileStaleMinutes() * 60_000,
  );
  const abandonCutoff = new Date(
    now.getTime() - reconcileAbandonMinutes() * 60_000,
  );

  const rows = await prisma.imageGeneration.findMany({
    where: { status: { in: [...ACTIVE] }, updatedAt: { lt: staleCutoff } },
    orderBy: { updatedAt: "asc" },
    take: reconcileBatchSize(),
    select: { id: true, userId: true, createdAt: true, providerJobId: true },
  });

  const result: ReconcileResult = {
    examined: rows.length,
    advanced: 0,
    abandoned: 0,
    unresolved: 0,
  };

  for (const row of rows) {
    // No provider job past the stale window means the create call died before
    // the provider acknowledged it; there is nothing left to poll.
    if (!row.providerJobId) {
      const failed = await failStuck(
        row.id,
        "provider_no_job",
        "The provider never acknowledged this request.",
        now,
      );
      if (failed) result.abandoned += 1;
      continue;
    }

    if (row.createdAt < abandonCutoff) {
      const failed = await failStuck(
        row.id,
        "provider_timeout",
        "The provider did not finish this request in time.",
        now,
      );
      if (failed) result.abandoned += 1;
      continue;
    }

    const refreshed = await refreshImageGeneration(row.userId, row.id);
    if (!refreshed.ok) {
      result.unresolved += 1;
      if (refreshed.error === "provider_unavailable") {
        logOps("warn", "image_generation_reconcile_provider_unavailable", {
          generationId: row.id,
        });
        break;
      }
      continue;
    }
    if (isTerminalStatus(refreshed.value.status)) {
      result.advanced += 1;
    } else {
      result.unresolved += 1;
    }
  }

  if (result.examined > 0) {
    logOps("info", "image_generation_reconcile", { ...result });
  }
  return result;
}
