import {
  WORKFLOW_STAGE_ORDER,
  type WorkflowStageId,
} from "@/lib/eva/design-workflow/workflow-stage-ids";

/** Canonical field keys for gates and `workflowSatisfied` JSON. */
export const WORKFLOW_FIELD_IDS = [
  "room_and_goals",
  "preference_style",
  "preference_budget",
  "layout_context",
  "clarification_resolved",
  "recommendation_engaged",
  "refinement_feedback",
  "decision_signals",
] as const;

export type WorkflowFieldId = (typeof WORKFLOW_FIELD_IDS)[number];

export type PlaybookStageDefinition = {
  id: WorkflowStageId;
  name: string;
  description: string;
  purpose: string;
  requiredFields: WorkflowFieldId[];
  optionalFields: WorkflowFieldId[];
  /** Human-readable rules; evaluated in `evaluate.ts`. */
  completionRules: string[];
  /** Injected into the assistant system prompt for this stage. */
  assistantGuidance: string;
  /** Product copy: what Eva suggests next for the user. */
  nextStepMessage: string;
};

/**
 * Single source of truth for the Furnishes design Playbook (Phase 4B).
 * Keep in sync with Prisma `DesignWorkflowStage`.
 */
export const PLAYBOOK_STAGES: Record<WorkflowStageId, PlaybookStageDefinition> =
  {
    intake: {
      id: "intake",
      name: "Intake",
      description:
        "Understand the space, who uses it, and what success looks like before suggesting products.",
      purpose:
        "Anchor the project in real goals and constraints so later recommendations stay relevant.",
      requiredFields: ["room_and_goals"],
      optionalFields: ["layout_context"],
      completionRules: [
        "Room label and a short project story (or brief snapshot) meet the minimum bar.",
        "Enough context exists to ask informed preference questions next.",
      ],
      assistantGuidance: `Workflow stage: INTAKE.
Prioritize: understanding goals, room role, occupants, and hard constraints before suggesting SKUs.
Ask: 1–2 focused questions per turn; avoid jumping to shopping lists.
Do not: present final product picks unless the user explicitly asks for examples.`,
      nextStepMessage:
        "Share how you use the room, who lives there, and any must-haves or deal-breakers.",
    },
    preference_capture: {
      id: "preference_capture",
      name: "Preference capture",
      description:
        "Lock in style direction, budget posture, and layout-relevant facts.",
      purpose:
        "Give recommendation and clarification steps concrete signals to work from.",
      requiredFields: ["preference_style", "preference_budget"],
      optionalFields: ["layout_context"],
      completionRules: [
        "Style direction is expressed (words, refs, or confirmed preferences).",
        "Budget is numeric, a range, or explicitly flexible/TBD.",
      ],
      assistantGuidance: `Workflow stage: PREFERENCE CAPTURE.
Prioritize: style vocabulary, palette/material direction, budget envelope (ranges OK), and non-negotiables.
Ask: short, concrete preference probes; summarize back what you heard.
Do not: treat preferences as final until the user confirms or repeats them.`,
      nextStepMessage:
        "Confirm style words, palette lean, and rough budget posture (or say you’re flexible).",
    },
    clarification: {
      id: "clarification",
      name: "Clarification",
      description:
        "Resolve gaps or contradictions that would make recommendations unreliable.",
      purpose:
        "Prevent premature picks when critical facts (e.g. layout-critical dimensions) are still missing.",
      requiredFields: ["clarification_resolved"],
      optionalFields: ["layout_context"],
      completionRules: [
        "No blocking gaps remain for the next recommendation pass (see evaluator).",
        "Contradictions are either resolved or explicitly deferred with user consent.",
      ],
      assistantGuidance: `Workflow stage: CLARIFICATION.
Prioritize: resolving contradictions, missing measurements, and ambiguous constraints.
Ask: targeted clarification until you can recommend without guessing.
Do not: generate long recommendation lists while key facts are still unknown.`,
      nextStepMessage:
        "Answer Eva’s follow-ups so we don’t recommend into the wrong constraints.",
    },
    recommendation_generation: {
      id: "recommendation_generation",
      name: "Recommendations",
      description:
        "Propose concrete directions, products, or layouts the user can react to.",
      purpose:
        "Turn captured preferences into actionable options with clear tradeoffs.",
      requiredFields: ["recommendation_engaged"],
      optionalFields: ["refinement_feedback"],
      completionRules: [
        "At least one substantive recommendation pass has landed (tracked when options are offered).",
        "Move to refinement when the user reacts with changes or alternatives.",
      ],
      assistantGuidance: `Workflow stage: RECOMMENDATION GENERATION.
Prioritize: actionable options tied to stated preferences and constraints; compare tradeoffs clearly.
Ask: which direction to stress-test next, or what would invalidate an option.
Do not: stall with more intake questions unless a gap blocks recommendations.`,
      nextStepMessage:
        "React to options—what feels right, what’s off—and we’ll narrow.",
    },
    refinement: {
      id: "refinement",
      name: "Refinement",
      description:
        "Iterate on direction—alternatives, scale, finishes, phasing—based on feedback.",
      purpose: "Tighten the plan until the user can decide or hand off.",
      requiredFields: ["refinement_feedback"],
      optionalFields: ["decision_signals"],
      completionRules: [
        "User feedback on prior options has been incorporated or acknowledged.",
      ],
      assistantGuidance: `Workflow stage: REFINEMENT.
Prioritize: iterating on chosen direction—alternatives, sizing, finishes, phasing.
Ask: what to optimize next (look vs cost vs delivery).
Do not: reset to broad discovery unless the user pivots.`,
      nextStepMessage:
        "Call out what to change: scale, price tier, material, or layout.",
    },
    decision_handoff: {
      id: "decision_handoff",
      name: "Decision & handoff",
      description:
        "Commit, export, purchase, or validate last steps before execution.",
      purpose: "Close the loop with clear next actions and risks.",
      requiredFields: ["decision_signals"],
      optionalFields: [],
      completionRules: [
        "User has expressed readiness to buy, book, export, or finalize scope.",
      ],
      assistantGuidance: `Workflow stage: DECISION / HANDOFF.
Prioritize: clear next actions—what to buy, measure, book, or validate; risks and dependencies.
Ask: what decision is blocking progress.
Do not: add new broad scope unless the user asks.`,
      nextStepMessage:
        "Say what you’re ready to buy or book next, and what you still need to compare.",
    },
  };

export const PLAYBOOK_STAGE_LIST: PlaybookStageDefinition[] =
  WORKFLOW_STAGE_ORDER.map((id) => PLAYBOOK_STAGES[id]);

export const WORKFLOW_FIELD_LABELS: Record<WorkflowFieldId, string> = {
  room_and_goals: "Room & goals",
  preference_style: "Style direction",
  preference_budget: "Budget posture",
  layout_context: "Layout / dimensions",
  clarification_resolved: "Open questions cleared",
  recommendation_engaged: "Recommendations offered",
  refinement_feedback: "Refinement based on feedback",
  decision_signals: "Decision / next steps",
};

/** Tunable gates for `evaluateProjectWorkflow` (single place — avoid magic numbers in the evaluator). */
export const WORKFLOW_EVAL_THRESHOLDS = {
  minTitleChars: 2,
  minRoomChars: 2,
  minDescriptionChars: 12,
  minBriefValueChars: 8,
  /** Heuristic: enough chat volume to treat “recommendations” as engaged if prefs are thin. */
  recommendationEngagedMessageCount: 4,
  /** Auto-advance rec → refinement only after at least this many user/assistant turns. */
  refineAdvanceMinMessages: 2,
} as const;

/** Short strings merged into the LLM system prompt by `prompt.ts` (avoid ad-hoc copy). */
export const WORKFLOW_LLM_HINTS = {
  recommendationBlockersReminder:
    "Before long pick lists, make sure style/budget and any layout-critical gaps won’t mislead—say what’s still fuzzy in plain language if needed.",
  checklistPrefix: "Still open:",
  userFacingNextPrefix: "Natural next question:",
  workflowContextHeader: "[Project phase — internal]",
  /** Appended to workflow block so replies stay conversational, not like a status engine. */
  conversationalDelivery:
    "How you speak: use this phase to steer internally—do not say “workflow,” stage IDs, checklist headers, or meta labels. Sound like a design partner; mention process only if it genuinely helps them decide. On short, casual questions (greetings, small talk, or a quick fact), answer directly without restating phase, milestones, or internal checklist language.",
} as const;
