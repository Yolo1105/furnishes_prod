import { mergeAssistantIntoSystemPrompt } from "@/lib/eva/personas/prompt";
import {
  mergePromptPreferenceContext,
  type ProfileContext,
} from "@/server/preferences/preference-prompt-context";
import type { ChatPreferenceCategory } from "@/server/preferences/preference-types";
import type { AssistantPersonaDefinition } from "@/lib/eva/personas/persona-types";
import type { ChatProviderMessage } from "./chat-provider";
import {
  criticalFactsToPromptBlock,
  extractCriticalTurnFacts,
  hasCriticalTurnFacts,
} from "./chat-critical-facts";
import { getResponseLengthInstruction } from "./chat-response-length";
import { lookupDesignRules } from "./design-rules";
import {
  formatReferenceKnowledgeBlock,
  isChatRagEnabled,
} from "@/server/rag/prompt-block";
import { retrieveRelevant } from "@/server/rag/retriever";
import type { RetrievalQualityLevel } from "@/server/rag/types";
import { logChatOperationalEvent } from "./chat-ops";
import { logOps } from "@/server/ops/log";

const BASE_SYSTEM_PROMPT = `You are Eva, a Furnishes interior design assistant inside the Account studio.
Help with rooms, layout, style, color, furniture, and budget tradeoffs.
Be specific and practical. Do not invent Product catalog SKUs or shopping links.
Do not claim access to systems that are not connected.
When the user mixes conflicting style signals (e.g. minimalist and cozy maximalist), name the tension explicitly, propose a dominant/accent resolution, and invite them to confirm that resolution as a preference — never silently pick one style.`;

function latestUserMessage(
  messages: ChatProviderMessage[] | undefined,
  explicit: string | undefined,
): string {
  if (explicit?.trim()) return explicit.trim();
  if (!messages?.length) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role === "user" && message.content.trim()) {
      return message.content.trim();
    }
  }
  return "";
}

type BuildChatSystemPromptInput = {
  persona: AssistantPersonaDefinition;
  memoryEnabled: boolean;
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  /** Origin per category (`manual_chat` | `extracted_confirmed`, …). */
  confirmedPreferenceSources?: Partial<
    Record<ChatPreferenceCategory, string | null>
  >;
  profileContext: ProfileContext;
  /** Latest user turn; when omitted, taken from `messages` if provided. */
  userMessage?: string;
  /** Optional history used only to resolve `userMessage` when not passed. */
  messages?: ChatProviderMessage[];
  /** Pre-built RAG appendix (omit when RAG disabled / empty). */
  referenceKnowledgeBlock?: string;
  /**
   * Design-workflow overlays (CHAT_WORKFLOW_ENABLED=1 only).
   * When omitted, prompt assembly matches the pre-workflow path.
   */
  workflow?: {
    assistantGuidance: string;
    promptSuffix: string;
    /** Overrides Task 1.2 auto length when non-null. */
    responseLength: string | null;
  } | null;
  /** Attachment grounding appendix (CHAT_ATTACHMENTS_ENABLED=1). */
  attachmentGroundingBlock?: string;
  /**
   * Rolling summary of earlier turns (CHAT_SUMMARY_ENABLED=1).
   * Pre-formatted via `formatContextSummaryPromptBlock`.
   */
  contextSummaryBlock?: string;
  /**
   * Project ground-truth block (CHAT_PROJECT_MEMORY_ENABLED=1).
   */
  projectMemoryBlock?: string;
  /**
   * Room plan readiness block (CHAT_ROOM_PLAN_ENABLED=1).
   * Placed after workflow; turn-volatile (not in stable prefix).
   */
  roomPlanBlock?: string;
  /** Copilot page context (CHAT_COPILOT_MODE_ENABLED=1). */
  pageContextBlock?: string;
  /** Forces length instruction when set (copilot). */
  responseLengthOverride?: string;
};

/**
 * Cache-friendly assembly order (stable prefix first):
 * 1 base → 2 persona → 3 design rules → 4 project memory → 5 workflow →
 * (stable ends) → room plan → 6 conversation summary → 7 RAG → 8 attachments →
 * 9 critical facts → 10 length.
 * Preference/profile blocks sit after persona (session-stable).
 */
export function buildChatSystemPrompt(
  input: BuildChatSystemPromptInput,
): string {
  return assembleChatSystemPrompt(input).prompt;
}

function assembleChatSystemPrompt(input: BuildChatSystemPromptInput): {
  prompt: string;
  promptPrefixStableChars: number;
} {
  const merged = mergePromptPreferenceContext({
    memoryEnabled: input.memoryEnabled,
    confirmed: input.confirmedPreferences,
    ...(input.confirmedPreferenceSources
      ? { confirmedSources: input.confirmedPreferenceSources }
      : {}),
    profile: input.profileContext,
  });

  let prompt = mergeAssistantIntoSystemPrompt(
    BASE_SYSTEM_PROMPT,
    input.persona,
  );
  if (merged.preferenceBlock) {
    prompt += `\n\n${merged.preferenceBlock}`;
  }
  if (merged.profileBlock) {
    prompt += `\n\n${merged.profileBlock}`;
  }

  const userMessage = latestUserMessage(input.messages, input.userMessage);

  // (3) Static design guidance (keyword-gated tables — content is static).
  if (userMessage) {
    const designRules = lookupDesignRules(userMessage);
    if (designRules) {
      prompt += `\n\n${designRules}`;
    }
  }

  // (4) Project memory
  if (input.projectMemoryBlock?.trim()) {
    prompt += `\n\n${input.projectMemoryBlock.trim()}`;
  }

  // (5) Workflow
  if (input.workflow?.assistantGuidance.trim()) {
    prompt += `\n\n${input.workflow.assistantGuidance.trim()}`;
  }
  if (input.workflow?.promptSuffix.trim()) {
    prompt += `\n\nNatural next focus: ${input.workflow.promptSuffix.trim()}`;
  }

  // Mark end of relatively stable prefix (before turn-volatile plan/summary/RAG/facts).
  const promptPrefixStableChars = prompt.length;

  // Room plan (after workflow; orderable readiness — flag-gated)
  if (input.roomPlanBlock?.trim()) {
    prompt += `\n\n${input.roomPlanBlock.trim()}`;
  }

  // (6) Conversation summary
  if (input.contextSummaryBlock?.trim()) {
    prompt += `\n\n${input.contextSummaryBlock.trim()}`;
  }

  // (7) RAG
  if (input.referenceKnowledgeBlock?.trim()) {
    prompt += `\n\n${input.referenceKnowledgeBlock.trim()}`;
  }

  // (8) Attachments
  if (input.attachmentGroundingBlock?.trim()) {
    prompt += `\n\n${input.attachmentGroundingBlock.trim()}`;
  }

  // Copilot untrusted page context (after attachments; never in stable prefix alone)
  if (input.pageContextBlock?.trim()) {
    prompt += `\n\n${input.pageContextBlock.trim()}`;
  }

  // (9) Critical-turn facts + (10) response length
  if (userMessage) {
    const facts = extractCriticalTurnFacts(userMessage);
    if (hasCriticalTurnFacts(facts)) {
      prompt += `\n\n${criticalFactsToPromptBlock(facts)}`;
    }

    const lengthInstruction =
      input.responseLengthOverride?.trim() ||
      input.workflow?.responseLength?.trim() ||
      getResponseLengthInstruction(userMessage);
    prompt += `\n\n${lengthInstruction}`;
  } else if (input.responseLengthOverride?.trim()) {
    prompt += `\n\n${input.responseLengthOverride.trim()}`;
  }

  return { prompt, promptPrefixStableChars };
}

/**
 * Async prompt assembly: optional RAG retrieval when CHAT_RAG_ENABLED=1.
 * Flag-off path is byte-identical to `buildChatSystemPrompt` without a block.
 */
export async function resolveChatSystemPrompt(
  input: BuildChatSystemPromptInput & {
    userId?: string;
    conversationId?: string;
  },
): Promise<{
  systemPrompt: string;
  retrievalQuality: RetrievalQualityLevel | null;
  promptPrefixStableChars: number;
}> {
  const userMessage = latestUserMessage(input.messages, input.userMessage);
  let referenceKnowledgeBlock = input.referenceKnowledgeBlock;
  let retrievalQuality: RetrievalQualityLevel | null = null;

  if (isChatRagEnabled() && userMessage && !referenceKnowledgeBlock) {
    const costContext = input.userId
      ? {
          userId: input.userId,
          conversationId: input.conversationId ?? null,
        }
      : undefined;
    const retrieved = await retrieveRelevant(
      userMessage,
      costContext ? { costContext } : {},
    );
    retrievalQuality = retrieved.quality;
    const block = formatReferenceKnowledgeBlock(retrieved);
    if (block) referenceKnowledgeBlock = block;

    if (input.userId) {
      const ragEvent: Parameters<typeof logChatOperationalEvent>[0] = {
        event: "chat_rag_retrieval",
        userId: input.userId,
        errorCategory: retrieved.quality,
        proposalCount: retrieved.hits.length,
      };
      if (input.conversationId) {
        ragEvent.conversationId = input.conversationId;
      }
      logChatOperationalEvent(ragEvent);
    }
  }

  const { prompt: systemPrompt, promptPrefixStableChars } =
    assembleChatSystemPrompt({
      ...input,
      ...(referenceKnowledgeBlock ? { referenceKnowledgeBlock } : {}),
    });

  if (input.userId) {
    logOps("info", "prompt_prefix_stable_chars", {
      userId: input.userId,
      conversationId: input.conversationId ?? null,
      promptPrefixStableChars,
      systemPromptChars: systemPrompt.length,
    });
  }

  return { systemPrompt, retrievalQuality, promptPrefixStableChars };
}

export function buildProviderMessages(input: {
  systemPrompt: string;
  history: ChatProviderMessage[];
}): ChatProviderMessage[] {
  return [{ role: "system", content: input.systemPrompt }, ...input.history];
}
