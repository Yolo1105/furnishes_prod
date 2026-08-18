/**
 * Conversation design-workflow advance evaluation (pure).
 * Re-derived from legacy `lib/eva/design-workflow/evaluate.ts`, simplified for
 * conversation-scoped prefs (no project brief / workflowSatisfied graph).
 */

import {
  WORKFLOW_STAGE_ORDER,
  isWorkflowStageId,
  type WorkflowStageId,
} from "./stages";

const LAYOUT_RE =
  /layout|floor plan|dimensions?|measure|square feet|sq\.?\s*ft|ft\b|meter|width|length|arrange|placement/i;
const REFINE_RE =
  /refine|instead|too |don'?t like|not that|prefer|smaller|cheaper|other option|swap|alternative/i;
const DECISION_RE =
  /ready to buy|purchase|order|finalize|decide|go with|lock in|export|share|shortlist/i;
const FLEX_RE = /flexible|unsure|tbd|open|don'?t know|dk\b/i;
const BUDGET_RE = /budget|spend|price|afford|\$|usd|sgd|under \d/i;
const STYLE_RE =
  /style|aesthetic|palette|vibe|look|scandi|boho|mid-century|modern|traditional|minimal|japandi|industrial|coastal|rustic/i;

type WorkflowAdvanceResult = {
  stageId: WorkflowStageId;
  stageComplete: boolean;
  missingFieldList: string[];
  hasRecommendationBlockers: boolean;
  canAutoAdvance: boolean;
  suggestedNextStage: WorkflowStageId | null;
  autoAdvanceReason: string | null;
};

function pref(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function hasRoom(confirmed: Record<string, string | null>): boolean {
  return pref(confirmed.room).length >= 2;
}

function hasStyle(
  confirmed: Record<string, string | null>,
  userMessage: string,
): boolean {
  if (pref(confirmed.style).length >= 2) return true;
  return STYLE_RE.test(userMessage);
}

function hasBudget(
  confirmed: Record<string, string | null>,
  userMessage: string,
): boolean {
  const budget = pref(confirmed.budget);
  if (budget.length >= 1) return true;
  if (FLEX_RE.test(userMessage) || BUDGET_RE.test(userMessage)) return true;
  return false;
}

function hasLayoutDimensions(roomDimensions: unknown): boolean {
  if (roomDimensions == null) return false;
  if (typeof roomDimensions === "string")
    return roomDimensions.trim().length > 0;
  if (typeof roomDimensions !== "object" || Array.isArray(roomDimensions)) {
    return false;
  }
  const row = roomDimensions as Record<string, unknown>;
  if (typeof row.raw === "string" && row.raw.trim()) return true;
  const width =
    typeof row.widthFeet === "number"
      ? row.widthFeet
      : typeof row.widthInches === "number"
        ? row.widthInches / 12
        : null;
  const length =
    typeof row.lengthFeet === "number"
      ? row.lengthFeet
      : typeof row.lengthInches === "number"
        ? row.lengthInches / 12
        : null;
  return width != null && length != null;
}

function wantsLayoutHeavy(userMessage: string): boolean {
  return LAYOUT_RE.test(userMessage);
}

/**
 * Decide whether the conversation should auto-advance this turn.
 */
export function evaluateAdvance(input: {
  stage: string;
  messageCount: number;
  confirmedPreferences: Record<string, string | null>;
  userMessage?: string;
  roomDimensions?: unknown;
  /** When a room plan exists, ≥50% core decided also unlocks refinement. */
  roomPlan?: {
    coreItemCount: number;
    decidedCount: number;
  } | null;
}): WorkflowAdvanceResult {
  const stageId: WorkflowStageId = isWorkflowStageId(input.stage)
    ? input.stage
    : "intake";
  const userMessage = input.userMessage?.trim() ?? "";
  const roomOk = hasRoom(input.confirmedPreferences);
  const styleOk = hasStyle(input.confirmedPreferences, userMessage);
  const budgetOk = hasBudget(input.confirmedPreferences, userMessage);
  const layoutOk = hasLayoutDimensions(input.roomDimensions);
  const layoutHeavy = wantsLayoutHeavy(userMessage);

  const blockers: string[] = [];
  if (!styleOk) blockers.push("style direction");
  if (!budgetOk) blockers.push("budget posture");
  if (layoutHeavy && !layoutOk) {
    blockers.push("layout / dimensions");
  }
  const hasRecommendationBlockers = blockers.length > 0;
  const clarificationResolved = !hasRecommendationBlockers;

  const missingFieldList: string[] = [];
  let stageComplete = false;

  if (stageId === "intake") {
    if (!roomOk) missingFieldList.push("room");
    // Enough context to ask preference questions: room + at least one turn.
    stageComplete = roomOk && input.messageCount >= 1;
  } else if (stageId === "preference_capture") {
    if (!styleOk) missingFieldList.push("style direction");
    if (!budgetOk) missingFieldList.push("budget posture");
    stageComplete = styleOk && budgetOk;
  } else if (stageId === "clarification") {
    if (!clarificationResolved) missingFieldList.push(...blockers);
    stageComplete = clarificationResolved;
  } else if (stageId === "recommendation_generation") {
    stageComplete = true;
  } else if (stageId === "refinement") {
    stageComplete = DECISION_RE.test(userMessage);
  } else if (stageId === "decision_handoff") {
    stageComplete = true;
  }

  let suggestedNextStage: WorkflowStageId | null = null;
  let autoAdvanceReason: string | null = null;
  let canAutoAdvance = false;

  if (stageId === "intake" && stageComplete) {
    suggestedNextStage = "preference_capture";
    autoAdvanceReason = "Core room and goals captured.";
    canAutoAdvance = true;
  } else if (stageId === "preference_capture" && styleOk && budgetOk) {
    if (hasRecommendationBlockers) {
      suggestedNextStage = "clarification";
      autoAdvanceReason =
        "Style and budget captured; layout or constraint gaps need clarification.";
      canAutoAdvance = true;
    } else {
      suggestedNextStage = "recommendation_generation";
      autoAdvanceReason =
        "Preferences sufficient to propose concrete directions.";
      canAutoAdvance = true;
    }
  } else if (stageId === "clarification" && clarificationResolved) {
    suggestedNextStage = "recommendation_generation";
    autoAdvanceReason =
      "Blocking questions resolved; ready for recommendations.";
    canAutoAdvance = true;
  } else if (stageId === "recommendation_generation") {
    const refineByMessage =
      REFINE_RE.test(userMessage) && input.messageCount >= 2;
    const planCoreReady =
      input.roomPlan != null &&
      input.roomPlan.coreItemCount > 0 &&
      input.roomPlan.decidedCount / input.roomPlan.coreItemCount >= 0.5;
    if (refineByMessage || planCoreReady) {
      suggestedNextStage = "refinement";
      autoAdvanceReason = planCoreReady
        ? "At least half of core room-plan items are decided."
        : "User is iterating on options.";
      canAutoAdvance = true;
    }
  } else if (stageId === "refinement" && DECISION_RE.test(userMessage)) {
    suggestedNextStage = "decision_handoff";
    autoAdvanceReason = "User signals readiness to decide or export.";
    canAutoAdvance = true;
  }

  if (suggestedNextStage) {
    const targetIdx = WORKFLOW_STAGE_ORDER.indexOf(suggestedNextStage);
    const curIdx = WORKFLOW_STAGE_ORDER.indexOf(stageId);
    if (targetIdx <= curIdx) {
      suggestedNextStage = null;
      autoAdvanceReason = null;
      canAutoAdvance = false;
    }
  }

  return {
    stageId,
    stageComplete,
    missingFieldList,
    hasRecommendationBlockers,
    canAutoAdvance,
    suggestedNextStage,
    autoAdvanceReason,
  };
}
