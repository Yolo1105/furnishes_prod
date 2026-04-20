import {
  PLAYBOOK_STAGES,
  WORKFLOW_EVAL_THRESHOLDS,
  WORKFLOW_FIELD_LABELS,
  type WorkflowFieldId,
} from "@/lib/eva/design-workflow/definition";
import { parseWorkflowSatisfied } from "@/lib/eva/design-workflow/workflow-satisfied-json";
import {
  isWorkflowStageId,
  WORKFLOW_STAGE_ORDER,
  type WorkflowStageId,
} from "@/lib/eva/design-workflow/workflow-stage-ids";

export type FieldSatisfactionLevel = "missing" | "partial" | "satisfied";

export type FieldStatusEntry = {
  id: WorkflowFieldId;
  label: string;
  status: FieldSatisfactionLevel;
  detail?: string;
};

export type WorkflowEvaluation = {
  stageId: WorkflowStageId;
  stageName: string;
  whyThisStage: string;
  requiredFieldStatus: FieldStatusEntry[];
  optionalFieldStatus: FieldStatusEntry[];
  /** User-facing labels for gaps that block advancing from this stage. */
  missingFieldList: string[];
  /** Flat map for API / persistence hints. */
  requiredFieldStatusMap: Record<WorkflowFieldId, FieldSatisfactionLevel>;
  stageComplete: boolean;
  hasRecommendationBlockers: boolean;
  /** True when automatic transition should run this turn (caller still applies guards). */
  canAutoAdvance: boolean;
  suggestedNextStage: WorkflowStageId | null;
  autoAdvanceReason: string | null;
  /** Merge into `Project.workflowSatisfied` (booleans). */
  workflowSatisfiedPatch: Record<string, boolean>;
  evaRecommendsNext: string;
  /** Concise explanation for UI (Playbook panel, hub). */
  transitionExplanation: string;
};

const STYLE_RE =
  /style|aesthetic|palette|vibe|look|scandi|boho|mid\-century|modern|traditional|minimal|japandi|industrial|coastal|rustic/i;
const BUDGET_RE = /budget|spend|price|afford|\$|usd|sgd|under \d|k\b/i;
const FLEX_RE = /flexible|unsure|tbd|open|don'?t know|dk\b/i;
const LAYOUT_RE =
  /layout|floor plan|dimensions?|measure|square feet|sq\.?\s*ft|ft\b|meter|width|length|arrange|placement/i;
const REFINE_RE =
  /refine|instead|too |don'?t like|not that|prefer|smaller|cheaper|other option|swap|alternative/i;
const DECISION_RE =
  /ready to buy|purchase|order|finalize|decide|go with|lock in|export|share|shortlist/i;

function parseBrief(snapshot: unknown): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot))
    return null;
  return snapshot as Record<string, unknown>;
}

function prefEntries(prefs: Record<string, string>): Array<[string, string]> {
  return Object.entries(prefs);
}

function hasStyleSignal(args: {
  description: string;
  prefs: Record<string, string>;
  brief: Record<string, unknown> | null;
  userMessage: string;
}): boolean {
  if (STYLE_RE.test(args.description)) return true;
  if (STYLE_RE.test(args.userMessage)) return true;
  for (const [k, v] of prefEntries(args.prefs)) {
    if (STYLE_RE.test(k) || STYLE_RE.test(v)) return true;
  }
  if (args.brief) {
    for (const v of Object.values(args.brief)) {
      const s =
        typeof v === "string"
          ? v
          : v != null && typeof v === "object"
            ? JSON.stringify(v)
            : String(v);
      if (STYLE_RE.test(s)) return true;
    }
  }
  return false;
}

function hasBudgetSignal(args: {
  budgetCents: number;
  prefs: Record<string, string>;
  userMessage: string;
}): boolean {
  if (args.budgetCents > 0) return true;
  if (FLEX_RE.test(args.userMessage)) return true;
  for (const [k, v] of prefEntries(args.prefs)) {
    if (BUDGET_RE.test(k) || BUDGET_RE.test(v) || FLEX_RE.test(v)) return true;
  }
  if (BUDGET_RE.test(args.userMessage) || FLEX_RE.test(args.userMessage))
    return true;
  return false;
}

function hasLayoutContext(prefs: Record<string, string>): boolean {
  const w = prefs.roomWidth ?? prefs.room_width;
  const l = prefs.roomLength ?? prefs.room_length;
  if (w && l && String(w).trim().length > 0 && String(l).trim().length > 0) {
    return true;
  }
  return false;
}

function wantsLayoutHeavy(args: {
  description: string;
  userMessage: string;
  prefs: Record<string, string>;
}): boolean {
  const blob = `${args.description}\n${args.userMessage}`;
  if (LAYOUT_RE.test(blob)) return true;
  for (const [k, v] of prefEntries(args.prefs)) {
    if (LAYOUT_RE.test(k) || LAYOUT_RE.test(v)) return true;
  }
  return false;
}

function evalRoomAndGoals(args: {
  title: string;
  room: string;
  description: string;
  brief: Record<string, unknown> | null;
}): FieldStatusEntry {
  const roomOk =
    args.room.trim().length >= WORKFLOW_EVAL_THRESHOLDS.minRoomChars;
  const titleOk =
    args.title.trim().length >= WORKFLOW_EVAL_THRESHOLDS.minTitleChars;
  const descOk =
    args.description.trim().length >=
    WORKFLOW_EVAL_THRESHOLDS.minDescriptionChars;
  const briefOk =
    args.brief &&
    Object.values(args.brief).some((v) => {
      const s =
        typeof v === "string"
          ? v
          : v != null && typeof v === "object"
            ? JSON.stringify(v)
            : String(v);
      return s.trim().length >= WORKFLOW_EVAL_THRESHOLDS.minBriefValueChars;
    });
  if (roomOk && titleOk && (descOk || briefOk))
    return {
      id: "room_and_goals",
      label: WORKFLOW_FIELD_LABELS.room_and_goals,
      status: "satisfied",
    };
  if (roomOk || descOk || briefOk || titleOk)
    return {
      id: "room_and_goals",
      label: WORKFLOW_FIELD_LABELS.room_and_goals,
      status: "partial",
      detail: "Add a bit more about goals or constraints.",
    };
  return {
    id: "room_and_goals",
    label: WORKFLOW_FIELD_LABELS.room_and_goals,
    status: "missing",
    detail: "Describe the room and what you want to achieve.",
  };
}

function entryStatus(
  id: WorkflowFieldId,
  level: FieldSatisfactionLevel,
  detail?: string,
): FieldStatusEntry {
  return {
    id,
    label: WORKFLOW_FIELD_LABELS[id],
    status: level,
    detail,
  };
}

/**
 * Central workflow evaluation for a project + conversation preferences.
 * Call from chat, APIs, and transition logic — not from scattered UI heuristics.
 */
export function evaluateProjectWorkflow(args: {
  workflowStage: string;
  project: {
    title: string;
    room: string;
    description: string;
    budgetCents: number;
    briefSnapshot: unknown;
    workflowSatisfied: unknown;
  };
  preferences: Record<string, string>;
  messageCount: number;
  userMessage: string;
}): WorkflowEvaluation {
  const stageId: WorkflowStageId = isWorkflowStageId(args.workflowStage)
    ? args.workflowStage
    : "intake";
  const def = PLAYBOOK_STAGES[stageId];
  const brief = parseBrief(args.project.briefSnapshot);
  const satisfied = parseWorkflowSatisfied(args.project.workflowSatisfied);

  const roomGoals = evalRoomAndGoals({
    title: args.project.title,
    room: args.project.room,
    description: args.project.description,
    brief,
  });

  const styleOk = hasStyleSignal({
    description: args.project.description,
    prefs: args.preferences,
    brief,
    userMessage: args.userMessage,
  });
  const styleEntry = styleOk
    ? entryStatus("preference_style", "satisfied")
    : entryStatus(
        "preference_style",
        Object.keys(args.preferences).length >= 1 ? "partial" : "missing",
        "Add style direction (words, links, or reference images).",
      );

  const budgetOk = hasBudgetSignal({
    budgetCents: args.project.budgetCents,
    prefs: args.preferences,
    userMessage: args.userMessage,
  });
  const budgetEntry = budgetOk
    ? entryStatus("preference_budget", "satisfied")
    : entryStatus(
        "preference_budget",
        "missing",
        "Set a budget range or say you’re flexible.",
      );

  const layoutOk = hasLayoutContext(args.preferences);
  const layoutEntry = layoutOk
    ? entryStatus("layout_context", "satisfied")
    : wantsLayoutHeavy({
          description: args.project.description,
          userMessage: args.userMessage,
          prefs: args.preferences,
        })
      ? entryStatus(
          "layout_context",
          "partial",
          "Add rough room dimensions for layout-specific help.",
        )
      : entryStatus("layout_context", "partial");

  const blockersForRec: string[] = [];
  if (!styleOk) blockersForRec.push(WORKFLOW_FIELD_LABELS.preference_style);
  if (!budgetOk) blockersForRec.push(WORKFLOW_FIELD_LABELS.preference_budget);
  if (
    wantsLayoutHeavy({
      description: args.project.description,
      userMessage: args.userMessage,
      prefs: args.preferences,
    }) &&
    !layoutOk &&
    !satisfied.layout_deferred
  ) {
    blockersForRec.push(
      `${WORKFLOW_FIELD_LABELS.layout_context} (needed for layout-heavy goals)`,
    );
  }

  /** Legacy projects may only have `clarification_complete`; new writes use `clarification_resolved` only. */
  const clarificationResolved =
    blockersForRec.length === 0 ||
    satisfied.clarification_complete === true ||
    satisfied.clarification_resolved === true ||
    satisfied.layout_deferred === true;

  const clarificationEntry = clarificationResolved
    ? entryStatus("clarification_resolved", "satisfied")
    : entryStatus(
        "clarification_resolved",
        "missing",
        "Resolve blocking gaps before broad recommendations.",
      );

  const recEngaged =
    satisfied.recommendation_engaged === true ||
    satisfied.rec_round_complete === true ||
    /recommend|option|here are|consider|i suggest|you could try/i.test(
      args.userMessage,
    ) ||
    args.messageCount >=
      WORKFLOW_EVAL_THRESHOLDS.recommendationEngagedMessageCount;

  const recEntry = recEngaged
    ? entryStatus("recommendation_engaged", "satisfied")
    : entryStatus(
        "recommendation_engaged",
        "partial",
        "Offer concrete options tied to their brief.",
      );

  const refinementOk =
    satisfied.refinement_feedback === true || REFINE_RE.test(args.userMessage);

  const refinementEntry = refinementOk
    ? entryStatus("refinement_feedback", "satisfied")
    : entryStatus(
        "refinement_feedback",
        "partial",
        "Respond to their reaction with alternatives or tradeoffs.",
      );

  const decisionOk =
    satisfied.decision_signals === true || DECISION_RE.test(args.userMessage);

  const decisionEntry = decisionOk
    ? entryStatus("decision_signals", "satisfied")
    : entryStatus(
        "decision_signals",
        "partial",
        "Confirm purchase, export, or next validation step.",
      );

  const byId: Record<WorkflowFieldId, FieldStatusEntry> = {
    room_and_goals: roomGoals,
    preference_style: styleEntry,
    preference_budget: budgetEntry,
    layout_context: layoutEntry,
    clarification_resolved: clarificationEntry,
    recommendation_engaged: recEntry,
    refinement_feedback: refinementEntry,
    decision_signals: decisionEntry,
  };

  const required = def.requiredFields.map((id) => byId[id]);
  const optional = def.optionalFields.map((id) => byId[id]);

  const requiredMap = Object.fromEntries(
    required.map((r) => [r.id, r.status]),
  ) as Record<WorkflowFieldId, FieldSatisfactionLevel>;

  /** Required fields satisfied for this stage (partial allowed only where noted). */
  const stageComplete = def.requiredFields.every((fid) => {
    if (
      fid === "recommendation_engaged" ||
      fid === "refinement_feedback" ||
      fid === "decision_signals"
    ) {
      return byId[fid].status === "satisfied" || byId[fid].status === "partial";
    }
    return byId[fid].status === "satisfied";
  });

  const missingFieldList = required
    .filter((r) => r.status === "missing")
    .map((r) => r.label);

  const hasRecommendationBlockers = blockersForRec.length > 0;

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
  } else if (
    stageId === "recommendation_generation" &&
    REFINE_RE.test(args.userMessage) &&
    args.messageCount >= 2
  ) {
    suggestedNextStage = "refinement";
    autoAdvanceReason = "User is iterating on options.";
    canAutoAdvance = true;
  } else if (stageId === "refinement" && DECISION_RE.test(args.userMessage)) {
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

  const whyThisStage = `Stage “${def.name}”: ${def.purpose}`;

  const workflowSatisfiedPatch: Record<string, boolean> = {
    room_and_goals: roomGoals.status !== "missing",
    preference_style: styleOk,
    preference_budget: budgetOk,
    layout_context: layoutOk,
    clarification_resolved: clarificationResolved,
    recommendation_engaged: recEngaged,
    refinement_feedback: refinementOk,
    decision_signals: decisionOk,
  };

  const transitionExplanation = (() => {
    if (!stageComplete && missingFieldList.length > 0) {
      return `Complete: ${missingFieldList.join(", ")}.`;
    }
    if (stageId === "preference_capture" && hasRecommendationBlockers) {
      return `Before recommendations: address ${blockersForRec.join(", ")}.`;
    }
    if (canAutoAdvance && suggestedNextStage && autoAdvanceReason) {
      return autoAdvanceReason;
    }
    return def.completionRules[0] ?? def.description;
  })();

  return {
    stageId,
    stageName: def.name,
    whyThisStage,
    requiredFieldStatus: required,
    optionalFieldStatus: optional,
    missingFieldList,
    requiredFieldStatusMap: requiredMap,
    stageComplete,
    hasRecommendationBlockers,
    canAutoAdvance,
    suggestedNextStage,
    autoAdvanceReason,
    workflowSatisfiedPatch,
    evaRecommendsNext: def.nextStepMessage,
    transitionExplanation,
  };
}
