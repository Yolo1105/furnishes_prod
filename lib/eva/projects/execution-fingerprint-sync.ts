import type { Prisma, PrismaClient } from "@prisma/client";
import { parseDecisionContext } from "@/lib/eva/projects/decision-schemas";
import {
  parseProjectExecutionState,
  type ExecutionSubstitutionEntry,
} from "@/lib/eva/projects/execution-state-schema";
import { computeExecutionFingerprints } from "@/lib/eva/projects/execution-orchestration";
import { EXECUTION_SUBSTITUTION_LOG_MESSAGES } from "@/lib/eva/projects/summary-constants";

/**
 * After decision or shortlist mutations, update fingerprints and append substitution log.
 * First run only seeds fingerprints (no log noise).
 */
export async function syncExecutionStateAfterContentChange(
  db: PrismaClient,
  projectId: string,
): Promise<void> {
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      shortlistItems: {
        orderBy: { updatedAt: "desc" },
        take: 64,
      },
    },
  });
  if (!p) return;

  const decision = parseDecisionContext(p.decisionContext);
  const shortlistRows = p.shortlistItems.map((s) => ({
    id: s.id,
    productName: s.productName,
    status: s.status,
  }));

  const fps = computeExecutionFingerprints({ decision, shortlistRows });
  const state = parseProjectExecutionState(p.executionState);
  const prior = state.fingerprints;

  if (prior?.decision === fps.decision && prior?.shortlist === fps.shortlist) {
    return;
  }

  const bootstrap = !prior?.decision || !prior?.shortlist;
  const log: ExecutionSubstitutionEntry[] = [...(state.substitutionLog ?? [])];
  const now = new Date().toISOString();

  if (!bootstrap && prior) {
    if (prior.decision !== fps.decision) {
      log.push({
        at: now,
        kind: "decision_update",
        summary: EXECUTION_SUBSTITUTION_LOG_MESSAGES.decisionChanged,
      });
    }
    if (prior.shortlist !== fps.shortlist) {
      log.push({
        at: now,
        kind: "shortlist_update",
        summary: EXECUTION_SUBSTITUTION_LOG_MESSAGES.shortlistChanged,
      });
    }
  }

  const nextState = {
    ...state,
    fingerprints: {
      decision: fps.decision,
      shortlist: fps.shortlist,
    },
    substitutionLog: log.slice(-100),
  };

  await db.project.update({
    where: { id: projectId },
    data: { executionState: nextState as Prisma.InputJsonValue },
  });
}
