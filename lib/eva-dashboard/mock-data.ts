// Playbook workflow defaults (UI dev / non–Playbook-logic phase).
export type {
  PlaybookNode as WfNode,
  PlaybookEdge as WfEdge,
} from "@/lib/eva/playbook/types";
import type { PlaybookNode, PlaybookEdge } from "@/lib/eva/playbook/types";

/**
 * Default playbook nodes — maps to Eva's current hardcoded behavior.
 * Each node carries a `config` that feeds the existing pipeline.
 */
export const INIT_WF_NODES: PlaybookNode[] = [
  {
    id: "start",
    x: 340,
    y: 40,
    w: 300,
    title: "START",
    body: "Say hello to the user. Introduce yourself as Eva, part of the Furnishes design team.",
    type: "start",
    icon: "home",
    config: {
      systemPromptSuffix:
        "This is the start of the conversation. Greet the user warmly and ask what room they're working on.",
      responseLength: "short",
      ragEnabled: false,
      designRulesEnabled: false,
    },
  },
  {
    id: "detect",
    x: 340,
    y: 210,
    w: 300,
    title: "DETECT INTENT",
    body: "Extract room type, style keywords, and furniture mentions from user input.",
    type: "collect",
    icon: "search",
    config: {
      extractionFocus: ["roomType", "style", "furniture"],
      responseLength: "medium",
      ragEnabled: false,
      designRulesEnabled: false,
    },
  },
  {
    id: "collect",
    x: 160,
    y: 400,
    w: 280,
    title: "COLLECT PREFERENCES",
    body: "Ask about style, budget, color theme, must-have furniture, and layout preferences.",
    type: "collect",
    icon: "clipboard-list",
    config: {
      requiredFields: ["roomType", "style", "budget"],
      extractionFocus: ["style", "budget", "color", "furniture"],
      systemPromptSuffix:
        "Focus on gathering the user's core preferences: style, budget, and colors. Be proactive — if they've given room type but not budget, ask about budget. If they have room and budget but no style, ask about style.",
      responseLength: "medium",
      ragEnabled: true,
      designRulesEnabled: false,
    },
  },
  {
    id: "clarify",
    x: 560,
    y: 400,
    w: 280,
    title: "CLARIFY INTENT",
    body: "Ask user to confirm or correct the detected room type and preferences.",
    type: "clarify",
    icon: "help-circle",
    config: {
      clarificationTemplate:
        "I want to make sure I have this right. You're looking at a {{roomType}} with a {{style}} style — is that correct?",
      responseLength: "short",
      ragEnabled: false,
      designRulesEnabled: false,
    },
  },
  {
    id: "brief",
    x: 160,
    y: 590,
    w: 280,
    title: "GENERATE BRIEF",
    body: "Compile all extracted data into a structured design brief with concrete recommendations.",
    type: "generate",
    icon: "file-text",
    config: {
      systemPromptSuffix:
        "The user has provided their core preferences. Give concrete, specific design recommendations. Name actual furniture types, materials, and color combinations. Structure your response with an opening that ties to their constraints, 2-3 options, and a next step.",
      responseLength: "detailed",
      ragEnabled: true,
      designRulesEnabled: true,
      onEnterAction: "generate_brief",
    },
  },
  {
    id: "review",
    x: 340,
    y: 760,
    w: 300,
    title: "REVIEW & CONFIRM",
    body: "Present the complete brief. Ask for confirmation or adjustments. Offer shopping list or layout help.",
    type: "end",
    icon: "check-circle",
    config: {
      systemPromptSuffix:
        "The design brief is ready. Help the user refine it — offer to adjust pieces, create a shopping list, or help with room layout. Be specific and actionable.",
      responseLength: "auto",
      ragEnabled: true,
      designRulesEnabled: true,
    },
  },
  {
    id: "kb",
    x: 720,
    y: 40,
    w: 260,
    title: "KNOWLEDGE BASE",
    body: "Reference product catalog and style guides when user asks questions.",
    type: "knowledge",
    icon: "book-open",
    config: {
      ragEnabled: true,
      designRulesEnabled: true,
    },
  },
];

/**
 * Default playbook edges with real transition conditions.
 */
export const INIT_WF_EDGES: PlaybookEdge[] = [
  {
    id: "e1",
    from: "start",
    to: "detect",
    label: "FIRST MESSAGE",
    condition: { type: "first_message" },
    priority: 0,
  },
  {
    id: "e2",
    from: "detect",
    to: "collect",
    label: "ROOM IDENTIFIED",
    condition: { type: "field_has_value", field: "roomType" },
    priority: 0,
  },
  {
    id: "e3",
    from: "detect",
    to: "clarify",
    label: "NEEDS CLARIFICATION",
    condition: { type: "confidence_below", threshold: 0.6 },
    priority: 1,
  },
  {
    id: "e4",
    from: "clarify",
    to: "collect",
    label: "CONFIRMED",
    condition: { type: "field_has_value", field: "roomType" },
    priority: 0,
  },
  {
    id: "e5",
    from: "collect",
    to: "brief",
    label: "ALL CAPTURED",
    condition: { type: "fields_complete" },
    priority: 0,
  },
  {
    id: "e6",
    from: "brief",
    to: "review",
    label: "BRIEF READY",
    condition: { type: "always" },
    priority: 0,
  },
];

export type TraceEntry =
  | { time: string; text: string; action?: string }
  | {
      time: string;
      userQuote: string;
      changes?: {
        field: string;
        after: string;
        confidence: number;
        action: string;
      }[];
      reasoning?: string;
    };
