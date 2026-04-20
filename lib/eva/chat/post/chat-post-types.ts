import type { AssistantDefinition } from "@/lib/eva/assistants/catalog";
import type { ParsedChatPostBody } from "@/lib/eva/chat/request/parse-chat-request";
import type { ChatGenerationLogContext } from "@/lib/eva/server/chat-generation-log";
import type { StudioSnapshotPayload } from "@/lib/eva/studio/studio-snapshot-schema";

/** Standard early exit: validation, auth, rate limits, moderation. */
export type ChatPostStageReject = { outcome: "reject"; response: Response };

/** After request body and guardrails succeed, before DB conversation work. */
export type ChatPostValidatedRequestPayload = {
  parsed: ParsedChatPostBody;
  studioSnapshotPayload: StudioSnapshotPayload | null;
  attachmentList: import("@/lib/eva/api/chat-attachment").ChatAttachmentPayload[];
  chatRequestId: string;
  traceId: string | null;
  requestedAssistantId: string;
};

export type ChatPostValidatedRequest =
  | ChatPostStageReject
  | { outcome: "ok"; payload: ChatPostValidatedRequestPayload };

/** Result of resolving/creating the conversation and persisting the user turn. */
export type ChatConversationResolution =
  | ChatPostStageReject
  | {
      outcome: "ok";
      value: {
        convoId: string;
        setCookieHeader: string | undefined;
        userMessage: { id: string };
        effectiveAssistantId: string;
        assistantForPrompt: AssistantDefinition;
        costWarning: boolean;
        chatGenLogCtx: ChatGenerationLogContext;
      };
    };

/**
 * Shared shape for `streamText` / `generateText` (minus `model`) used by the chat route.
 */
export type ChatPromptCoreGeneration = {
  system: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  abortSignal: AbortSignal;
};
