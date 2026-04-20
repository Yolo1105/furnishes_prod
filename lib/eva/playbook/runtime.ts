/**
 * Playbook runtime — resolves the active node and evaluates transitions.
 *
 * This module sits between the playbook graph (stored in DB) and the chat pipeline.
 * It does NOT replace the pipeline; it configures it by returning the active node's config.
 */
import { prisma } from "@/lib/eva/db";
import { log } from "@/lib/eva/core/logger";
import { detectIntent } from "@/lib/eva/policy/intent-detector";
import type {
  PlaybookNode,
  PlaybookEdge,
  PlaybookGraph,
  PlaybookNodeConfig,
  EdgeCondition,
} from "./types";

// ── Playbook loading (cached per-request lifecycle) ─────────────────────────

let _cachedGraph: PlaybookGraph | null = null;

export function invalidatePlaybookCache(): void {
  _cachedGraph = null;
}

async function loadPlaybook(): Promise<PlaybookGraph | null> {
  if (_cachedGraph) return _cachedGraph;
  try {
    const row = await prisma.playbook.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    if (!row) return null;
    const nodes = row.nodes as unknown;
    const edges = row.edges as unknown;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;
    // Only treat it as a real playbook if nodes carry a `config` object
    const hasConfig = (nodes as PlaybookNode[]).some(
      (n) => n.config && typeof n.config === "object",
    );
    if (!hasConfig) return null;
    _cachedGraph = {
      nodes: nodes as PlaybookNode[],
      edges: edges as PlaybookEdge[],
    };
    return _cachedGraph;
  } catch {
    return null;
  }
}

// ── Active node resolution ──────────────────────────────────────────────────

const DEFAULT_NODE_CONFIG: PlaybookNodeConfig = {
  ragEnabled: true,
  designRulesEnabled: true,
  responseLength: "auto",
};

export interface ActiveNodeResult {
  node: PlaybookNode | null;
  config: PlaybookNodeConfig;
  graph: PlaybookGraph | null;
}

/**
 * Get the active playbook node for a conversation.
 * Returns null node + default config when no playbook is configured,
 * so callers can always use config without null-checking.
 */
export async function getActiveNode(
  conversationId: string,
): Promise<ActiveNodeResult> {
  const graph = await loadPlaybook();
  if (!graph || graph.nodes.length === 0) {
    return { node: null, config: DEFAULT_NODE_CONFIG, graph: null };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { currentNodeId: true },
  });

  const currentNodeId = conversation?.currentNodeId;
  let node: PlaybookNode | null = null;

  if (currentNodeId) {
    node = graph.nodes.find((n) => n.id === currentNodeId) ?? null;
  }
  // Fallback to the start node
  if (!node) {
    node =
      graph.nodes.find((n) => n.type === "start") ?? graph.nodes[0] ?? null;
  }

  const config = node?.config
    ? { ...DEFAULT_NODE_CONFIG, ...node.config }
    : DEFAULT_NODE_CONFIG;

  return { node, config, graph };
}

// ── Edge condition evaluation ───────────────────────────────────────────────

interface EvalContext {
  preferences: Record<string, string>;
  message: string;
  messageCount: number;
  lastExtractionConfidence: number | null;
  sourceNode: PlaybookNode;
}

function evaluateCondition(
  condition: EdgeCondition,
  ctx: EvalContext,
): boolean {
  switch (condition.type) {
    case "always":
      return true;

    case "first_message":
      return ctx.messageCount <= 1;

    case "fields_complete": {
      const required = ctx.sourceNode.config?.requiredFields ?? [];
      if (required.length === 0) return false;
      return required.every((f) => {
        const val = ctx.preferences[f];
        return val !== undefined && val !== null && String(val).trim() !== "";
      });
    }

    case "field_has_value": {
      if (!condition.field) return false;
      const val = ctx.preferences[condition.field];
      return val !== undefined && val !== null && String(val).trim() !== "";
    }

    case "confidence_above":
      if (ctx.lastExtractionConfidence === null) return false;
      return ctx.lastExtractionConfidence >= (condition.threshold ?? 0.7);

    case "confidence_below":
      if (ctx.lastExtractionConfidence === null) return true; // no extraction = low confidence
      return ctx.lastExtractionConfidence < (condition.threshold ?? 0.7);

    case "intent_match": {
      if (!condition.intents?.length) return false;
      const detected = detectIntent(ctx.message);
      return detected !== null && condition.intents.includes(detected);
    }

    default:
      return false;
  }
}

// ── Transition evaluation ───────────────────────────────────────────────────

export interface TransitionResult {
  shouldTransition: boolean;
  nextNode: PlaybookNode | null;
  firedEdge: PlaybookEdge | null;
  reason: string;
}

/**
 * Evaluate outgoing edges from the current node and determine if a transition should happen.
 * Edges are sorted by priority (lower first). First matching edge wins.
 */
export function evaluateTransitions(
  graph: PlaybookGraph,
  currentNode: PlaybookNode,
  preferences: Record<string, string>,
  message: string,
  messageCount: number,
  lastExtractionConfidence: number | null,
): TransitionResult {
  const outgoing = graph.edges
    .filter((e) => e.from === currentNode.id)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  if (outgoing.length === 0) {
    return {
      shouldTransition: false,
      nextNode: null,
      firedEdge: null,
      reason: "no outgoing edges",
    };
  }

  const ctx: EvalContext = {
    preferences,
    message,
    messageCount,
    lastExtractionConfidence,
    sourceNode: currentNode,
  };

  for (const edge of outgoing) {
    if (!edge.condition) continue;
    if (evaluateCondition(edge.condition, ctx)) {
      const nextNode = graph.nodes.find((n) => n.id === edge.to) ?? null;
      if (!nextNode) continue; // edge points to nonexistent node, skip
      return {
        shouldTransition: true,
        nextNode,
        firedEdge: edge,
        reason: `${edge.condition.type}${edge.label ? ` (${edge.label})` : ""}`,
      };
    }
  }

  return {
    shouldTransition: false,
    nextNode: null,
    firedEdge: null,
    reason: "no edge conditions matched",
  };
}

// ── Transition execution ────────────────────────────────────────────────────

/**
 * Perform a node transition: update the conversation's currentNodeId and log it.
 */
export async function transitionTo(
  conversationId: string,
  fromNodeId: string | null,
  toNodeId: string,
  edgeId: string | null,
  reason: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { currentNodeId: toNodeId },
    }),
    prisma.nodeTransition.create({
      data: {
        conversationId,
        fromNodeId,
        toNodeId,
        edgeId,
        reason,
      },
    }),
  ]);

  invalidatePlaybookCache();

  log({
    level: "info",
    event: "playbook_transition",
    conversationId,
    fromNodeId,
    toNodeId,
    edgeId,
    reason,
  });
}
