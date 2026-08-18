/**
 * Design-workflow stage order and static per-stage config.
 * Re-derived from legacy `lib/eva/design-workflow/{definition,stages}.ts`.
 *
 * The legacy playbook graph engine is intentionally NOT ported — stage config
 * is static here (required categories, prompt overlays, response-length hints).
 */

import type { ChatPreferenceCategory } from "@/server/preferences/preference-types";

export const WORKFLOW_STAGE_ORDER = [
  "intake",
  "preference_capture",
  "clarification",
  "recommendation_generation",
  "refinement",
  "decision_handoff",
] as const;

export type WorkflowStageId = (typeof WORKFLOW_STAGE_ORDER)[number];

export function isWorkflowStageId(s: string): s is WorkflowStageId {
  return (WORKFLOW_STAGE_ORDER as readonly string[]).includes(s);
}

type WorkflowStageDefinition = {
  id: WorkflowStageId;
  name: string;
  description: string;
  assistantGuidance: string;
  /** Preference categories that must be present for policy when this stage is active. */
  requiredCategories: ChatPreferenceCategory[];
  /** When set, overrides Task 1.2 auto response-length instruction. */
  responseLength: string | null;
  promptSuffix: string;
};

const WORKFLOW_STAGES: Record<WorkflowStageId, WorkflowStageDefinition> = {
  intake: {
    id: "intake",
    name: "Intake",
    description:
      "Understand the space, who uses it, and what success looks like.",
    requiredCategories: [],
    responseLength:
      "Ask 1–2 focused questions; keep replies to a short paragraph.",
    assistantGuidance: `Prioritize: understanding goals, room role, occupants, and hard constraints before suggesting pieces.
Ask: 1–2 focused questions per turn; avoid jumping to shopping lists.
Do not: present final product picks unless the user explicitly asks for examples.`,
    promptSuffix:
      "Share how you use the room, who lives there, and any must-haves.",
  },
  preference_capture: {
    id: "preference_capture",
    name: "Preference capture",
    description: "Lock in style direction and budget posture.",
    requiredCategories: ["style", "budget"],
    responseLength:
      "Prefer short preference probes and a brief recap of what you heard.",
    assistantGuidance: `Prioritize: style vocabulary, palette/material direction, budget envelope (ranges OK), and non-negotiables.
Ask: short, concrete preference probes; summarize back what you heard.
Do not: treat preferences as final until the user confirms or repeats them.`,
    promptSuffix:
      "Confirm style words, palette lean, and rough budget posture (or say you’re flexible).",
  },
  clarification: {
    id: "clarification",
    name: "Clarification",
    description: "Resolve gaps that would make recommendations unreliable.",
    requiredCategories: [],
    responseLength:
      "Ask targeted clarifications; avoid long recommendation lists.",
    assistantGuidance: `Prioritize: resolving contradictions, missing measurements, and ambiguous constraints.
Ask: targeted clarification until you can recommend without guessing.
Do not: generate long recommendation lists while key facts are still unknown.`,
    promptSuffix:
      "Answer follow-ups so recommendations don’t land on the wrong constraints.",
  },
  recommendation_generation: {
    id: "recommendation_generation",
    name: "Recommendations",
    description: "Propose concrete directions the user can react to.",
    requiredCategories: [],
    responseLength:
      "Give enough to compare options clearly, but stay conversational.",
    assistantGuidance: `Prioritize: actionable options tied to stated preferences and constraints; compare tradeoffs clearly.
Ask: which direction to stress-test next, or what would invalidate an option.
Do not: stall with more intake questions unless a gap blocks recommendations.`,
    promptSuffix:
      "React to options—what feels right, what’s off—and we’ll narrow.",
  },
  refinement: {
    id: "refinement",
    name: "Refinement",
    description: "Iterate on direction based on feedback.",
    requiredCategories: [],
    responseLength:
      "Iterate on the chosen direction with concrete alternatives.",
    assistantGuidance: `Prioritize: iterating on chosen direction—alternatives, sizing, finishes, phasing.
Ask: what to optimize next (look vs cost vs delivery).
Do not: reset to broad discovery unless the user pivots.`,
    promptSuffix:
      "Call out what to change: scale, price tier, material, or layout.",
  },
  decision_handoff: {
    id: "decision_handoff",
    name: "Decision & handoff",
    description: "Commit or validate last steps before execution.",
    requiredCategories: [],
    responseLength:
      "List clear next actions and risks in a short closing summary.",
    assistantGuidance: `Prioritize: clear next actions—what to buy, measure, book, or validate; risks and dependencies.
Ask: what decision is blocking progress.
Do not: add new broad scope unless the user asks.`,
    promptSuffix:
      "Say what you’re ready to decide next, and what you still need to compare.",
  },
};

export function getWorkflowStage(stage: string): WorkflowStageDefinition {
  const id: WorkflowStageId = isWorkflowStageId(stage) ? stage : "intake";
  return WORKFLOW_STAGES[id];
}

/** Prompt overlays for `buildChatSystemPrompt` when workflow is enabled. */
export function workflowPromptOverlay(stage: string): {
  assistantGuidance: string;
  promptSuffix: string;
  responseLength: string | null;
} {
  const def = getWorkflowStage(stage);
  return {
    assistantGuidance: def.assistantGuidance,
    promptSuffix: def.promptSuffix,
    responseLength: def.responseLength,
  };
}

export function isChatWorkflowEnabled(): boolean {
  return process.env.CHAT_WORKFLOW_ENABLED === "1";
}
