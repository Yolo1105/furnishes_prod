/**
 * Orderable readiness score for a Room Plan.
 * Ships ahead of commerce by design — the plan terminates in an order later.
 *
 * Weights:
 * - core decided: 60
 * - secondary decided: 20
 * - budget within cap: 10
 * - style + color preferences confirmed: 10
 */

type ReadinessLabel =
  "exploring" | "taking shape" | "nearly ready" | "ready to order";

type ReadinessItem = {
  label: string;
  priority: string;
  status: string;
  budgetCents: number | null;
  actualCents: number | null;
};

type ReadinessPlan = {
  budgetCapCents: number | null;
  items: ReadinessItem[];
};

type ReadinessBreakdown = {
  coreScore: number;
  secondaryScore: number;
  budgetScore: number;
  preferenceScore: number;
};

export type ReadinessResult = {
  score: number;
  label: ReadinessLabel;
  missingCore: string[];
  overBudget: boolean;
  breakdown: ReadinessBreakdown;
};

const DECIDED = new Set(["decided", "purchased"]);

function isDecided(status: string): boolean {
  return DECIDED.has(status);
}

function labelForScore(
  score: number,
  allCoreDecided: boolean,
  overBudget: boolean,
): ReadinessLabel {
  if (allCoreDecided && !overBudget) return "ready to order";
  if (score >= 75) return "nearly ready";
  if (score >= 40) return "taking shape";
  return "exploring";
}

export function computeReadiness(input: {
  plan: ReadinessPlan;
  styleConfirmed?: boolean;
  colorConfirmed?: boolean;
}): ReadinessResult {
  const items = input.plan.items;
  const core = items.filter((item) => item.priority === "core");
  const secondary = items.filter((item) => item.priority === "secondary");

  const coreDecided = core.filter((item) => isDecided(item.status));
  const secondaryDecided = secondary.filter((item) => isDecided(item.status));

  const coreScore =
    core.length === 0 ? 0 : (coreDecided.length / core.length) * 60;
  const secondaryScore =
    secondary.length === 0
      ? 0
      : (secondaryDecided.length / secondary.length) * 20;

  const spend = items.reduce((sum, item) => {
    const amount = item.actualCents ?? item.budgetCents ?? 0;
    return sum + Math.max(0, amount);
  }, 0);
  const cap = input.plan.budgetCapCents;
  const overBudget = cap != null && cap > 0 ? spend > cap : false;
  const budgetScore = cap != null && cap > 0 && !overBudget ? 10 : 0;

  const styleOk = Boolean(input.styleConfirmed);
  const colorOk = Boolean(input.colorConfirmed);
  const preferenceScore = (styleOk ? 5 : 0) + (colorOk ? 5 : 0);

  const raw = coreScore + secondaryScore + budgetScore + preferenceScore;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const missingCore = core
    .filter((item) => !isDecided(item.status))
    .map((item) => item.label);

  const allCoreDecided = core.length > 0 && missingCore.length === 0;

  return {
    score,
    label: labelForScore(score, allCoreDecided, overBudget),
    missingCore,
    overBudget,
    breakdown: {
      coreScore: Math.round(coreScore),
      secondaryScore: Math.round(secondaryScore),
      budgetScore,
      preferenceScore,
    },
  };
}

/** Share of core items in decided/purchased status (0–1). */
export function coreDecidedRatio(items: ReadinessItem[]): number {
  const core = items.filter((item) => item.priority === "core");
  if (core.length === 0) return 0;
  const decided = core.filter((item) => isDecided(item.status)).length;
  return decided / core.length;
}
