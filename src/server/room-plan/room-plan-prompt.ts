/**
 * Compact room-plan prompt block for chat (flag-gated).
 */

import type { ReadinessResult } from "./readiness";

type RoomPlanPromptItem = {
  label: string;
  category: string;
  priority: string;
  status: string;
  budgetCents: number | null;
  actualCents: number | null;
};

type RoomPlanPromptInput = {
  name: string;
  currency: string;
  budgetCapCents: number | null;
  items: RoomPlanPromptItem[];
  readiness: ReadinessResult;
};

function money(cents: number | null, currency: string): string | null {
  if (cents == null) return null;
  return `${currency} ${(cents / 100).toFixed(0)}`;
}

export function formatRoomPlanPromptBlock(input: RoomPlanPromptInput): string {
  const allocated = input.items.reduce(
    (sum, item) => sum + Math.max(0, item.actualCents ?? item.budgetCents ?? 0),
    0,
  );
  const remaining =
    input.budgetCapCents != null
      ? Math.max(0, input.budgetCapCents - allocated)
      : null;

  const payload = {
    planName: input.name,
    currency: input.currency,
    budgetCap: money(input.budgetCapCents, input.currency),
    allocated: money(allocated, input.currency),
    remaining: money(remaining, input.currency),
    readiness: {
      score: input.readiness.score,
      label: input.readiness.label,
      missingCore: input.readiness.missingCore,
      overBudget: input.readiness.overBudget,
    },
    items: input.items.map((item) => ({
      label: item.label,
      category: item.category,
      priority: item.priority,
      status: item.status,
      budget: money(item.budgetCents, input.currency),
      actual: money(item.actualCents, input.currency),
    })),
  };

  return `[ROOM PLAN — orderable readiness]
Use this JSON to track the user's room toward a finished, on-budget plan. Tie every nudge to their own stated facts (budget cap, decided pieces, missing core). Complete core items before accents. Never invent urgency or generic FOMO. When citing budget, use the exact remaining figure from this block.

${JSON.stringify(payload)}`;
}
