import type { Prisma, PrismaClient } from "@prisma/client";
import { parseProjectExecutionState } from "@/lib/eva/projects/execution-state-schema";

export async function appendBlockerResolutionHistory(
  db: PrismaClient,
  projectId: string,
  entry: { blockerId: string; summary: string },
): Promise<void> {
  const p = await db.project.findUnique({
    where: { id: projectId },
    select: { executionState: true },
  });
  if (!p) return;
  const state = parseProjectExecutionState(p.executionState);
  const hist = [
    ...(state.blockerResolutionHistory ?? []),
    {
      blockerId: entry.blockerId,
      resolvedAt: new Date().toISOString(),
      summary: entry.summary.slice(0, 2000),
    },
  ].slice(-100);
  await db.project.update({
    where: { id: projectId },
    data: {
      executionState: {
        ...state,
        blockerResolutionHistory: hist,
      } as Prisma.InputJsonValue,
    },
  });
}
