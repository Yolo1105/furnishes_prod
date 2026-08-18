/**
 * Resolve chat mode / page-context / tools gating for a turn.
 */

import {
  chatModeSchema,
  copilotLengthInstruction,
  formatCopilotPageContextBlock,
  isChatCopilotModeEnabled,
  pageContextSchema,
  type ChatMode,
  type PageContext,
} from "./chat-copilot";
import {
  chatToolsRolloutMode,
  inferWouldFireTools,
  isChatToolsEnabled,
  isChatToolsExecuteEnabled,
  logToolShadow,
  type ChatToolMode,
} from "./chat-tools";

export function resolveRequestedChatMode(raw: unknown): ChatMode {
  const parsed = chatModeSchema.safeParse(raw ?? "full");
  return parsed.success ? parsed.data : "full";
}

export function resolvePageContext(raw: unknown): PageContext | null {
  if (raw == null) return null;
  const parsed = pageContextSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function buildModePromptExtras(input: {
  mode: ChatMode;
  pageContext: PageContext | null;
}): {
  mode: ChatToolMode;
  pageContextBlock?: string;
  responseLengthOverride?: string;
  suggestionsDisabled: boolean;
} {
  const wantsCopilot = input.mode === "copilot" && isChatCopilotModeEnabled();
  if (!wantsCopilot) {
    return { mode: "full", suggestionsDisabled: false };
  }
  return {
    mode: "copilot",
    ...(input.pageContext
      ? { pageContextBlock: formatCopilotPageContextBlock(input.pageContext) }
      : {}),
    responseLengthOverride: copilotLengthInstruction(),
    suggestionsDisabled: true,
  };
}

export function maybeLogToolShadow(input: {
  userId: string;
  conversationId: string;
  message: string;
}): void {
  if (!isChatToolsEnabled()) return;
  if (chatToolsRolloutMode() !== "shadow") return;
  logToolShadow({
    userId: input.userId,
    conversationId: input.conversationId,
    tools: inferWouldFireTools(input.message),
  });
}

export function shouldExecuteChatTools(input: {
  userId: string;
  email?: string | null;
}): boolean {
  return isChatToolsExecuteEnabled(input);
}
