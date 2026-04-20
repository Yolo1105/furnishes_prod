import type { ShortlistItemExternalLifecycle } from "@prisma/client";
import { PROJECT_OPERATIONAL_ROLLUP_COPY } from "@/lib/eva/projects/summary-constants";

/**
 * Phase 7 — coarse external execution phase derived from real persisted shortlist lifecycle + collaboration gates.
 * Not stored as a single enum on `Project` — recomputed from source tables.
 */
export type OperationalExecutionPhase =
  | "planning"
  | "review_pending"
  | "approved_path"
  | "sourcing_in_progress"
  | "waiting_on_quote_or_order"
  | "partially_delivered"
  | "blocked"
  | "completed"
  | "needs_substitution";

/** Single source for UI — keys must stay aligned with `deriveOperationalExecutionPhase`. */
export const OPERATIONAL_EXECUTION_PHASE_LABEL: Record<
  OperationalExecutionPhase,
  string
> = {
  planning: "Planning",
  review_pending: "Review pending",
  approved_path: "Approved path",
  sourcing_in_progress: "Sourcing in progress",
  waiting_on_quote_or_order: "Waiting on quote or order",
  partially_delivered: "Partially delivered",
  blocked: "Blocked",
  completed: "Completed",
  needs_substitution: "Needs substitution",
};

const DELIVERED: ShortlistItemExternalLifecycle[] = ["delivered"];

export function deriveOperationalExecutionPhase(input: {
  hasPendingHandoffApproval: boolean;
  hasActiveExecutionBlockers: boolean;
  /** Primary shortlist rows only (design role), with external lifecycle. */
  primaryItems: Array<{ externalLifecycle: ShortlistItemExternalLifecycle }>;
  allItems: Array<{ externalLifecycle: ShortlistItemExternalLifecycle }>;
}): { phase: OperationalExecutionPhase; hints: string[] } {
  const hints: string[] = [];

  if (input.hasPendingHandoffApproval) {
    hints.push(PROJECT_OPERATIONAL_ROLLUP_COPY.handoffApprovalPending);
    return { phase: "review_pending", hints };
  }

  if (input.hasActiveExecutionBlockers) {
    hints.push(PROJECT_OPERATIONAL_ROLLUP_COPY.activeBlockers);
    return { phase: "blocked", hints };
  }

  const prim = input.primaryItems;
  const all = input.allItems;

  if (prim.some((r) => r.externalLifecycle === "unavailable")) {
    hints.push(PROJECT_OPERATIONAL_ROLLUP_COPY.primaryUnavailable);
    return { phase: "needs_substitution", hints };
  }

  if (prim.some((r) => r.externalLifecycle === "replaced")) {
    hints.push(PROJECT_OPERATIONAL_ROLLUP_COPY.substitutionConfirm);
  }

  const anySourcing = all.some((r) => r.externalLifecycle === "sourcing");
  const anyQuoted = all.some((r) => r.externalLifecycle === "quoted");
  const anyOrdered = all.some((r) => r.externalLifecycle === "ordered");
  const anyDelivered = all.some((r) => DELIVERED.includes(r.externalLifecycle));
  const allDelivered =
    all.length > 0 && all.every((r) => DELIVERED.includes(r.externalLifecycle));

  if (allDelivered && all.length > 0) {
    return { phase: "completed", hints };
  }

  if (anyDelivered && (anyOrdered || anyQuoted || anySourcing)) {
    hints.push(PROJECT_OPERATIONAL_ROLLUP_COPY.partiallyDelivered);
    return { phase: "partially_delivered", hints };
  }

  if (anyOrdered) {
    hints.push(PROJECT_OPERATIONAL_ROLLUP_COPY.orderedTrackDelivery);
    return { phase: "waiting_on_quote_or_order", hints };
  }

  if (anyQuoted) {
    return { phase: "waiting_on_quote_or_order", hints };
  }

  if (anySourcing) {
    hints.push(PROJECT_OPERATIONAL_ROLLUP_COPY.sourcingActive);
    return { phase: "sourcing_in_progress", hints };
  }

  const allApprovedPath = all.every(
    (r) =>
      r.externalLifecycle === "approved" ||
      r.externalLifecycle === "shortlisted" ||
      r.externalLifecycle === "proposed",
  );
  if (all.length > 0 && allApprovedPath) {
    return { phase: "approved_path", hints };
  }

  return { phase: "planning", hints };
}
