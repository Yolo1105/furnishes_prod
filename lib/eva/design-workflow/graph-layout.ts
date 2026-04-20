import type { PlaybookNode, PlaybookEdge } from "@/lib/eva/playbook/types";
import { PLAYBOOK_STAGES } from "@/lib/eva/design-workflow/definition";
import {
  WORKFLOW_STAGE_ORDER,
  STAGE_LABEL,
  type WorkflowStageId,
} from "@/lib/eva/design-workflow/stages";

/** Canvas-only constants (visual graph — not workflow semantics). */
const CANVAS = {
  originX: 80,
  stepX: 200,
  originY: 120,
  staggerY: 40,
  nodeWidth: 190,
  maxAssistantSnippetChars: 400,
} as const;

const STAGE_NODE_TYPE: Record<WorkflowStageId, PlaybookNode["type"]> = {
  intake: "start",
  preference_capture: "collect",
  clarification: "clarify",
  recommendation_generation: "generate",
  refinement: "collect",
  decision_handoff: "end",
};

const STAGE_ICONS: Record<WorkflowStageId, string> = {
  intake: "home",
  preference_capture: "clipboard-list",
  clarification: "help-circle",
  recommendation_generation: "file-text",
  refinement: "pen-line",
  decision_handoff: "check-circle",
};

/**
 * Fixed canvas layout for the official design workflow (read-only reference graph).
 * Node `id` is the Prisma `DesignWorkflowStage` value so `liveNodeId` can match `workflowStage`.
 */
export function buildDesignWorkflowCanvasGraph(): {
  nodes: PlaybookNode[];
  edges: PlaybookEdge[];
} {
  const nodes: PlaybookNode[] = WORKFLOW_STAGE_ORDER.map((id, i) => {
    const def = PLAYBOOK_STAGES[id];
    const x = CANVAS.originX + i * CANVAS.stepX;
    const y = CANVAS.originY + (i % 2) * CANVAS.staggerY;
    return {
      id,
      x,
      y,
      w: CANVAS.nodeWidth,
      title: STAGE_LABEL[id].toUpperCase(),
      body: def.description,
      type: STAGE_NODE_TYPE[id],
      icon: STAGE_ICONS[id],
      config: {
        systemPromptSuffix: def.assistantGuidance.slice(
          0,
          CANVAS.maxAssistantSnippetChars,
        ),
        ragEnabled: id === "recommendation_generation" || id === "refinement",
        designRulesEnabled: id !== "intake" && id !== "preference_capture",
        responseLength:
          id === "decision_handoff"
            ? "medium"
            : id === "recommendation_generation"
              ? "detailed"
              : "medium",
      },
    };
  });

  const edges: PlaybookEdge[] = [];
  for (let i = 0; i < WORKFLOW_STAGE_ORDER.length - 1; i++) {
    const from = WORKFLOW_STAGE_ORDER[i]!;
    const to = WORKFLOW_STAGE_ORDER[i + 1]!;
    edges.push({
      id: `wf_${from}_${to}`,
      from,
      to,
      label: "NEXT",
      condition: { type: "always" },
      priority: 0,
    });
  }

  return { nodes, edges };
}
