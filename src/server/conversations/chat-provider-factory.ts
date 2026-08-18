import { createLocalChatProvider } from "./chat-provider-local";
import { createOpenAIChatProvider } from "./chat-provider-openai";
import type { ChatProvider } from "./chat-provider";
import { CHAT_GENERATION_FAILURE, ChatProviderError } from "./chat-failure";
import { CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE } from "./chat-copy";
import { isChatOpenaiRolloutEnabled } from "./chat-rollout";

type ChatProviderName = "local" | "openai";

function resolveName(raw = process.env.CHAT_PROVIDER): ChatProviderName {
  const value = (raw ?? "local").trim().toLowerCase();
  if (value === "openai") return "openai";
  return "local";
}

function allowLocalFallbackOutsideProduction(): boolean {
  if (process.env.CHAT_ALLOW_LOCAL_FALLBACK === "1") return true;
  if (process.env.CHAT_ALLOW_LOCAL_FALLBACK === "0") return false;
  return process.env.NODE_ENV !== "production";
}

/**
 * Resolve the configured chat provider.
 * Production never silently substitutes the local provider when OpenAI is selected.
 */
export function getChatProvider(): {
  name: ChatProviderName;
  provider: ChatProvider;
} {
  const name = resolveName();
  if (name !== "openai") {
    return { name: "local", provider: createLocalChatProvider() };
  }

  try {
    return { name: "openai", provider: createOpenAIChatProvider() };
  } catch (error) {
    if (!allowLocalFallbackOutsideProduction()) {
      if (error instanceof ChatProviderError) throw error;
      throw new ChatProviderError(
        CHAT_GENERATION_FAILURE.PROVIDER_UNAVAILABLE,
        CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
        { cause: error },
      );
    }
    console.warn(
      "[chat] OpenAI provider unavailable; using local provider in non-production.",
      error instanceof Error ? error.message : error,
    );
    return { name: "local", provider: createLocalChatProvider() };
  }
}

/**
 * Resolve provider for a specific user (cohort / allowlist aware).
 * When CHAT_PROVIDER=openai but the user is outside the rollout window,
 * serve the local provider so the cohort can expand safely.
 */
export function getChatProviderForUser(input: {
  userId: string;
  email?: string | null;
}): {
  name: ChatProviderName;
  provider: ChatProvider;
  rolloutDeferred: boolean;
} {
  if (resolveName() !== "openai") {
    const resolved = getChatProvider();
    return { ...resolved, rolloutDeferred: false };
  }
  if (!isChatOpenaiRolloutEnabled(input)) {
    return {
      name: "local",
      provider: createLocalChatProvider(),
      rolloutDeferred: true,
    };
  }
  const resolved = getChatProvider();
  return { ...resolved, rolloutDeferred: false };
}
