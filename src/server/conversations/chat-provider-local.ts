import type {
  ChatProvider,
  ChatProviderInput,
  ChatStreamChunk,
} from "./chat-provider";
import { resolveChatSystemPrompt } from "./chat-prompt";

/**
 * Deterministic local development fallback — not an external AI provider.
 * Reply text varies by persona so tests can prove selection affects generation.
 */
export function createLocalChatProvider(): ChatProvider {
  async function buildContent(input: ChatProviderInput): Promise<string> {
    const latestUser =
      [...input.messages].reverse().find((message) => message.role === "user")
        ?.content ?? "";
    const prefs = Object.entries(input.confirmedPreferences)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");

    await resolveChatSystemPrompt({
      persona: input.persona,
      memoryEnabled: input.memoryEnabled,
      confirmedPreferences: input.confirmedPreferences,
      ...(input.confirmedPreferenceSources
        ? { confirmedPreferenceSources: input.confirmedPreferenceSources }
        : {}),
      profileContext: input.profileContext,
      messages: input.messages,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.conversationId ? { conversationId: input.conversationId } : {}),
      ...(input.workflow ? { workflow: input.workflow } : {}),
      ...(input.attachmentGroundingBlock
        ? { attachmentGroundingBlock: input.attachmentGroundingBlock }
        : {}),
      ...(input.contextSummaryBlock
        ? { contextSummaryBlock: input.contextSummaryBlock }
        : {}),
      ...(input.projectMemoryBlock
        ? { projectMemoryBlock: input.projectMemoryBlock }
        : {}),
      ...(input.roomPlanBlock ? { roomPlanBlock: input.roomPlanBlock } : {}),
    });

    const lens =
      input.persona.focus === "style"
        ? "style lens (palette & cohesion)"
        : input.persona.focus === "layout"
          ? "plan lens (layout & flow)"
          : input.persona.focus === "budget"
            ? "budget lens (tradeoffs & priorities)"
            : "balanced lens";

    const memoryNote =
      input.memoryEnabled && prefs ? ` I see confirmed memory: ${prefs}.` : "";

    return (
      `[local:${input.persona.id}] Eva · ${lens}. ` +
      `You said: “${latestUser.slice(0, 160)}”.` +
      memoryNote +
      " A full AI provider is not connected in this environment yet — your message is saved, and this reply is the local studio fallback."
    );
  }

  return {
    async generate(input: ChatProviderInput) {
      return {
        content: await buildContent(input),
        model: "local",
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        requestId: null,
      };
    },
    async *stream(input: ChatProviderInput): AsyncIterable<ChatStreamChunk> {
      const content = await buildContent(input);
      const size = 18;
      for (let i = 0; i < content.length; i += size) {
        if (input.signal?.aborted) break;
        yield { text: content.slice(i, i + size) };
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      yield {
        text: "",
        done: true,
        model: "local",
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        requestId: null,
      };
    },
  };
}
