import type { AssistantPersonaDefinition } from "@/lib/eva/personas/persona-types";
import type { ChatPreferenceCategory } from "@/server/preferences/preference-types";
import type { ProfileContext } from "@/server/preferences/preference-prompt-context";

export type ChatProviderMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatProviderInput = {
  persona: AssistantPersonaDefinition;
  messages: ChatProviderMessage[];
  memoryEnabled: boolean;
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  confirmedPreferenceSources?: Partial<
    Record<ChatPreferenceCategory, string | null>
  >;
  profileContext: ProfileContext;
  /** Optional abort from the HTTP request (client Stop / disconnect). */
  signal?: AbortSignal;
  /** For RAG cost attribution when CHAT_RAG_ENABLED=1. */
  userId?: string;
  conversationId?: string;
  /** Design-workflow prompt overlays when CHAT_WORKFLOW_ENABLED=1. */
  workflow?: {
    assistantGuidance: string;
    promptSuffix: string;
    responseLength: string | null;
  } | null;
  /** Attachment grounding appendix when CHAT_ATTACHMENTS_ENABLED=1. */
  attachmentGroundingBlock?: string;
  /** Conversation memory appendix when CHAT_SUMMARY_ENABLED=1. */
  contextSummaryBlock?: string;
  /** Project memory appendix when CHAT_PROJECT_MEMORY_ENABLED=1. */
  projectMemoryBlock?: string;
  /** Room plan appendix when CHAT_ROOM_PLAN_ENABLED=1. */
  roomPlanBlock?: string;
  /** Copilot untrusted page context when CHAT_COPILOT_MODE_ENABLED=1. */
  pageContextBlock?: string;
  /** Override response-length instruction (copilot 2–4 sentences). */
  responseLengthOverride?: string;
  /**
   * When set and execute is true, OpenAI provider runs the tool loop
   * (chat-tool-loop) before/instead of a plain completion.
   */
  tools?: {
    mode: "full" | "copilot";
    execute: boolean;
  };
};

export type ChatProviderResult = {
  content: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  costUsd?: number | null;
  requestId?: string | null;
  toolsFired?: string[];
};

export type ChatStreamChunk = {
  text: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  costUsd?: number | null;
  requestId?: string | null;
  done?: boolean;
  toolActivity?: { tool: string; status: string };
};

export interface ChatProvider {
  generate(input: ChatProviderInput): Promise<ChatProviderResult>;
  /** Optional token stream. When absent, callers may chunk `generate`. */
  stream?(input: ChatProviderInput): AsyncIterable<ChatStreamChunk>;
}

/**
 * Prefer provider.stream; otherwise generate once and emit small text chunks.
 */
export async function* streamChatProvider(
  provider: ChatProvider,
  input: ChatProviderInput,
): AsyncGenerator<ChatStreamChunk> {
  if (provider.stream) {
    yield* provider.stream(input);
    return;
  }
  const result = await provider.generate(input);
  const text = result.content;
  const size = 24;
  for (let i = 0; i < text.length; i += size) {
    if (input.signal?.aborted) {
      yield {
        text: "",
        done: true,
        model: result.model ?? null,
        promptTokens: result.promptTokens ?? null,
        completionTokens: result.completionTokens ?? null,
        costUsd: result.costUsd ?? null,
        requestId: result.requestId ?? null,
      };
      return;
    }
    yield { text: text.slice(i, i + size) };
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
  yield {
    text: "",
    done: true,
    model: result.model ?? null,
    promptTokens: result.promptTokens ?? null,
    completionTokens: result.completionTokens ?? null,
    costUsd: result.costUsd ?? null,
    requestId: result.requestId ?? null,
  };
}
