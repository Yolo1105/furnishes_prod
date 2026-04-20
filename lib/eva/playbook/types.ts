/**
 * Playbook types — the configuration layer that drives Eva's conversation behavior.
 *
 * Each node represents a conversation phase that configures the existing pipeline.
 * Each edge represents a transition condition between phases.
 */

// ── Node types ──────────────────────────────────────────────────────────────

export type PlaybookNodeType =
  | "start"
  | "collect"
  | "clarify"
  | "generate"
  | "condition"
  | "knowledge"
  | "end";

export type ResponseLengthHint = "short" | "medium" | "detailed" | "auto";

/**
 * Runtime configuration carried by a playbook node.
 * Each field maps to an existing pipeline module it controls.
 */
export interface PlaybookNodeConfig {
  /** Appended to the base system prompt from domain.json when this node is active. */
  systemPromptSuffix?: string;
  /**
   * Preference fields that must be collected before outgoing "fields_complete" edges fire.
   * Maps to: policy/enforcement.ts required-field checks.
   */
  requiredFields?: string[];
  /**
   * Fields the extraction pipeline should prioritize when this node is active.
   * Maps to: extract/route.ts — added to the extraction prompt.
   */
  extractionFocus?: string[];
  /** Whether RAG knowledge retrieval is active. Maps to: retrieveRelevant() call in chat route. */
  ragEnabled?: boolean;
  /** Whether design rules (clearances, rug sizing, layout) are injected. Maps to: lookupDesignRule(). */
  designRulesEnabled?: boolean;
  /** Response length hint override. Maps to: getResponseLengthInstruction(). */
  responseLength?: ResponseLengthHint;
  /**
   * Clarification prompt template. Used when this node is a "clarify" type.
   * Supports {{field}} and {{value}} placeholders.
   */
  clarificationTemplate?: string;
  /**
   * Action to execute when entering this node (e.g. generate a brief, create shopping list).
   * Maps to: brainstorm/suggestions API calls.
   */
  onEnterAction?:
    | "generate_brief"
    | "generate_shopping_list"
    | "generate_suggestions"
    | null;
}

/**
 * A playbook node — a conversation phase with visual position + runtime config.
 */
export interface PlaybookNode {
  id: string;
  /** Visual position on canvas. */
  x: number;
  y: number;
  w: number;
  /** Display title shown on the node. */
  title: string;
  /** Human-readable description of what Eva does in this phase. */
  body: string;
  type: PlaybookNodeType;
  icon: string;
  /** Runtime config that feeds the existing pipeline. */
  config: PlaybookNodeConfig;
}

// ── Edge types ──────────────────────────────────────────────────────────────

export type EdgeConditionType =
  /** All requiredFields on the source node have values in preferences. */
  | "fields_complete"
  /** Average extraction confidence for recent message exceeds threshold. */
  | "confidence_above"
  /** Average extraction confidence for recent message is below threshold. */
  | "confidence_below"
  /** User message matches one of the specified intent keywords. */
  | "intent_match"
  /** Unconditional — always fires (used for default/fallback paths). */
  | "always"
  /** A specific preference field has a value. */
  | "field_has_value"
  /** First message in the conversation. */
  | "first_message";

export interface EdgeCondition {
  type: EdgeConditionType;
  /** Threshold for confidence_above / confidence_below (0-1). */
  threshold?: number;
  /** Intent keywords for intent_match (matched against detectIntent result). */
  intents?: string[];
  /** Field id for field_has_value. */
  field?: string;
}

/**
 * A playbook edge — a transition between nodes with a condition.
 */
export interface PlaybookEdge {
  id: string;
  from: string;
  to: string;
  /** Display label on the edge. */
  label?: string;
  /** Condition that must be true for this edge to fire. Omitted in legacy playbooks. */
  condition?: EdgeCondition;
  /** Lower number = evaluated first. Default 0. */
  priority?: number;
}

// ── Playbook graph ──────────────────────────────────────────────────────────

export interface PlaybookGraph {
  nodes: PlaybookNode[];
  edges: PlaybookEdge[];
}

// ── Transition log entry (for Decision Trace) ───────────────────────────────

export interface TransitionLogEntry {
  fromNodeId: string | null;
  toNodeId: string;
  edgeId: string | null;
  reason: string;
  timestamp: string;
}
