"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import type { ChatMessage, ChatErrorType } from "@/lib/eva-dashboard/types";
import {
  CHAT_STREAM_REVEAL_AWAIT_MAX_STEPS,
  CHAT_STREAM_REVEAL_CHARS_PER_SEC,
  CHAT_STREAM_REVEAL_FIRST_FRAME_MS,
  CHAT_STREAM_REVEAL_MAX_CHARS_PER_FRAME,
  CHAT_STREAM_REVEAL_MAX_FRAME_DELTA_MS,
  CHAT_STREAM_TIMEOUT_MS,
  DEFAULT_ASSISTANT,
} from "@/lib/eva-dashboard/core/constants";
import {
  sanitizeAssistantStreamDisplay,
  sanitizeOutput,
} from "@/lib/eva/core/output-sanitize";
import {
  CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED,
  CHAT_FAILURE_FETCH_GENERIC,
  CHAT_FAILURE_FETCH_NETWORK,
  CHAT_FAILURE_NO_RESPONSE_STREAM,
  CHAT_FAILURE_SANITIZATION_EMPTIED,
  CHAT_FAILURE_STREAM_TIMEOUT,
  isAssistantFailureDisplayContent,
} from "@/lib/eva/core/chat-copy";
import {
  CHAT_GENERATION_FAILURE,
  CHAT_RESPONSE_HEADER,
  inferGenerationFailureCategoryFromDisplayContent,
  type ChatGenerationFailureCategory,
} from "@/lib/eva/core/chat-generation-failure";
import { useCurrentPreferences } from "@/lib/eva-dashboard/contexts/current-preferences-context";
import { apiGet, apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import { useEvaAssistant } from "@/lib/eva-dashboard/contexts/eva-assistant-context";
import {
  assistantSummaryForClient,
  getAssistantById,
  normalizeAssistantId,
} from "@/lib/eva/assistants/catalog";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import type { ClientMessageSource } from "@/lib/eva/api/client-message-meta";
import type {
  ChatAttachmentPayload,
  ClientSurface,
} from "@/lib/eva/api/chat-attachment";
import type { StudioSnapshotPayload } from "@/lib/eva/studio/studio-snapshot-schema";
import { CHAT_OUTBOUND_HTTP } from "@/lib/eva/core/chat-http-header-names";
import { reportChatQualityEvent } from "@/lib/eva-dashboard/chat-quality-telemetry";

/** Classify an API error response into a typed error for distinct UI treatment. */
function classifyError(
  status: number,
  code?: string,
  message?: string,
): ChatErrorType {
  if (code === "RATE_LIMITED" || status === 429) {
    if (message?.includes("usage limit")) return "cost_limit";
    return "rate_limit";
  }
  if (code === "LLM_UNAVAILABLE" || status === 503) return "llm_unavailable";
  return "generic";
}

function makeErrorMessage(
  content: string,
  errorType: ChatErrorType,
  meta?: {
    generationFailureCategory?: ChatGenerationFailureCategory;
    chatRequestId?: string;
    clientAttemptId?: string;
  },
): ChatMessage {
  return {
    role: "assistant",
    content,
    isError: true,
    errorType,
    ...meta,
  };
}

function parseFailureCategoryHeader(
  headers: Headers,
): ChatGenerationFailureCategory | undefined {
  const raw = headers.get(CHAT_RESPONSE_HEADER.GENERATION_FAILURE);
  if (!raw) return undefined;
  const values = Object.values(CHAT_GENERATION_FAILURE) as string[];
  return values.includes(raw)
    ? (raw as ChatGenerationFailureCategory)
    : undefined;
}

export type SendMessageOptions = {
  /** Chip / preset: server skips extract when set (no redundant `skipExtraction` needed). */
  messageSource?: ClientMessageSource;
  /** Explicit extract skip without tagging source (rare). */
  skipExtraction?: boolean;
  /** Prior server `X-Chat-Request-Id` when retrying after a failed generation. */
  priorChatRequestId?: string;
  /** Studio image-gen grounding — validated server-side; omit outside Studio rail. */
  studioSnapshot?: StudioSnapshotPayload;
  /** Where the send originated (telemetry + conditional server behavior). */
  clientSurface?: ClientSurface;
  /** Structured attachments — not mixed into `message` text. */
  attachments?: ChatAttachmentPayload[];
};

/** True when the assistant stream had no usable reply (empty or terminal failure copy). */
function assistantReplyFailed(acc: string, flushedContent: string): boolean {
  if (!acc.trim()) return true;
  const t = flushedContent.trim();
  if (!t) return true;
  return isAssistantFailureDisplayContent(t);
}

interface ChatContextValue {
  messagesByKey: Record<string, ChatMessage[]>;
  setMessagesByKey: React.Dispatch<
    React.SetStateAction<Record<string, ChatMessage[]>>
  >;
  sendMessage: (
    key: string,
    userContent: string,
    options?: SendMessageOptions,
  ) => void;
  loadConversation: (
    chatKey: string,
    dbConversationId: string,
  ) => Promise<void>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  pendingMessage: string | null;
  setPendingMessage: (value: string | null) => void;
  clearPendingMessage: () => void;
  isStreamingForKey: (key: string) => boolean;
  isStreaming: boolean;
  conversationIds: Record<string, string>;
  /** Pending preference proposals (from extract) for confirmation banner. */
  proposalsByKey: Record<
    string,
    Array<{
      field: string;
      value: string;
      confidence: number;
      changeId: string;
    }>
  >;
  dismissProposals: (chatKey: string, changeId?: string) => void;
  /** Clear in-memory data for a chat key (e.g. when conversation is deleted). */
  removeConversationData: (chatKey: string) => void;
  /** Abort the active stream for this chat key; keeps partial text when available. */
  stopStreaming: (chatKey: string) => void;
  /**
   * True while the open chat has messages or is streaming — shell can subdue
   * surrounding panels without affecting chat internals.
   */
  chatThreadPrimacy: boolean;
  setChatThreadPrimacy: (active: boolean) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: React.ReactNode;
  /** When provided, pending message is controlled by parent (e.g. DashboardLayout). */
  pendingMessage?: string | null;
  setPendingMessage?: (value: string | null) => void;
  onClearPendingMessage?: () => void;
  onConversationTitleGenerated?: (
    oldRecentId: string,
    convoId: string,
    title: string,
  ) => void;
  /** Called when user sends first message from new-chat; parent should add to recents and set active item to convo-{id}. */
  onNewConversation?: (
    key: string,
    convoId: string,
    projectId: string | null,
  ) => void;
}

export function ChatProvider({
  children,
  pendingMessage: controlledPending,
  setPendingMessage: controlledSetPending,
  onClearPendingMessage,
  onConversationTitleGenerated,
  onNewConversation,
}: ChatProviderProps) {
  const [messagesByKey, setMessagesByKey] = useState<
    Record<string, ChatMessage[]>
  >({});
  const messagesByKeyRef = useRef(messagesByKey);
  messagesByKeyRef.current = messagesByKey;
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingKeyRef = useRef<string | null>(null);
  /** Raw accumulated display target from the provider (sanitized incrementally). */
  const streamRevealTargetRef = useRef("");
  /** What the user actually sees — catches up to target for smooth reveal. */
  const streamRevealShownRef = useRef("");
  const streamRevealRafRef = useRef<number | null>(null);
  const streamRevealLastTsRef = useRef(0);
  const streamRevealKeyRef = useRef<string | null>(null);
  const streamStartedAtRef = useRef(0);
  const firstTokenReportedRef = useRef(false);
  const userAbortRef = useRef(false);
  const [chatThreadPrimacy, setChatThreadPrimacy] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [internalPending, setInternalPending] = useState<string | null>(null);
  const [streamingKeys, setStreamingKeys] = useState<Set<string>>(new Set());
  const [conversationIds, setConversationIds] = useState<
    Record<string, string>
  >({});
  const [proposalsByKey, setProposalsByKey] = useState<
    Record<
      string,
      Array<{
        field: string;
        value: string;
        confidence: number;
        changeId: string;
      }>
    >
  >({});
  const { preferences: currentPreferences } = useCurrentPreferences();
  const { selectedAssistant, setSelectedAssistant } = useEvaAssistant();
  const activeProjectCtx = useActiveProjectOptional();

  const dismissProposals = useCallback((chatKey: string, changeId?: string) => {
    if (changeId) {
      setProposalsByKey((prev) => {
        const list =
          prev[chatKey]?.filter((p) => p.changeId !== changeId) ?? [];
        return list.length
          ? { ...prev, [chatKey]: list }
          : { ...prev, [chatKey]: [] };
      });
    } else {
      setProposalsByKey((prev) => ({ ...prev, [chatKey]: [] }));
    }
  }, []);

  const removeConversationData = useCallback((chatKey: string) => {
    setProposalsByKey((prev) => {
      const next = { ...prev };
      delete next[chatKey];
      return next;
    });
    setConversationIds((prev) => {
      const next = { ...prev };
      delete next[chatKey];
      return next;
    });
    setMessagesByKey((prev) => {
      const next = { ...prev };
      delete next[chatKey];
      return next;
    });
  }, []);

  const cancelStreamReveal = useCallback(() => {
    if (streamRevealRafRef.current != null) {
      cancelAnimationFrame(streamRevealRafRef.current);
      streamRevealRafRef.current = null;
    }
    streamRevealTargetRef.current = "";
    streamRevealShownRef.current = "";
    streamRevealLastTsRef.current = 0;
    streamRevealKeyRef.current = null;
  }, []);

  const pumpStreamReveal = useCallback(
    (effectiveKey: string) => {
      streamRevealKeyRef.current = effectiveKey;
      if (streamRevealRafRef.current !== null) return;
      const tick = (ts: number) => {
        const eff = streamRevealKeyRef.current ?? effectiveKey;
        const target = streamRevealTargetRef.current;
        let shown = streamRevealShownRef.current;
        if (shown === target) {
          streamRevealRafRef.current = null;
          return;
        }
        const prevTs = streamRevealLastTsRef.current;
        const dt =
          prevTs === 0
            ? CHAT_STREAM_REVEAL_FIRST_FRAME_MS
            : Math.min(
                CHAT_STREAM_REVEAL_MAX_FRAME_DELTA_MS,
                Math.max(1, ts - prevTs),
              );
        streamRevealLastTsRef.current = ts;
        const rate = CHAT_STREAM_REVEAL_CHARS_PER_SEC;
        const maxFrame = CHAT_STREAM_REVEAL_MAX_CHARS_PER_FRAME;
        const gap = target.length - shown.length;
        const n =
          gap <= 0
            ? 0
            : Math.max(
                1,
                Math.min(maxFrame, Math.floor((rate * dt) / 1000) || 1),
              );
        const step = Math.min(gap, n);
        shown = target.slice(0, shown.length + step);
        streamRevealShownRef.current = shown;
        if (
          !firstTokenReportedRef.current &&
          shown.length > 0 &&
          streamRevealKeyRef.current === eff
        ) {
          firstTokenReportedRef.current = true;
          reportChatQualityEvent("chat_first_token_visible", {
            latencyMs: Math.max(0, Date.now() - streamStartedAtRef.current),
            assistantId: selectedAssistant.id,
          });
        }
        setMessagesByKey((prev) => {
          const list = prev[eff] || [];
          const last = list[list.length - 1];
          if (last?.role !== "assistant") return prev;
          return {
            ...prev,
            [eff]: [...list.slice(0, -1), { ...last, content: shown }],
          };
        });
        streamRevealRafRef.current =
          shown !== target ? requestAnimationFrame(tick) : null;
      };
      streamRevealRafRef.current = requestAnimationFrame(tick);
    },
    [setMessagesByKey, selectedAssistant.id],
  );

  const awaitRevealEquals = useCallback(
    async (effectiveKey: string, finalContent: string) => {
      streamRevealTargetRef.current = finalContent;
      streamRevealKeyRef.current = effectiveKey;
      pumpStreamReveal(effectiveKey);
      let guard = 0;
      while (streamRevealShownRef.current !== finalContent) {
        if (++guard > CHAT_STREAM_REVEAL_AWAIT_MAX_STEPS) break;
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
      if (streamRevealRafRef.current != null) {
        cancelAnimationFrame(streamRevealRafRef.current);
        streamRevealRafRef.current = null;
      }
      streamRevealShownRef.current = finalContent;
      setMessagesByKey((prev) => {
        const list = prev[effectiveKey] || [];
        const last = list[list.length - 1];
        if (last?.role !== "assistant") return prev;
        return {
          ...prev,
          [effectiveKey]: [
            ...list.slice(0, -1),
            { ...last, content: finalContent },
          ],
        };
      });
    },
    [pumpStreamReveal, setMessagesByKey],
  );

  const pendingMessage =
    controlledPending !== undefined ? controlledPending : internalPending;
  const setPendingMessageState = controlledSetPending ?? setInternalPending;

  const sendMessage = useCallback(
    (key: string, userContent: string, options?: SendMessageOptions) => {
      const userMsg: ChatMessage = {
        role: "user",
        content: userContent,
        ...(options?.attachments?.length
          ? {
              attachmentReadiness: options.attachments.map((attachment) => ({
                label: attachment.label,
                clientReadiness: attachment.clientReadiness ?? "ready",
              })),
              chatAttachments: options.attachments,
            }
          : {}),
      };
      const placeholder: ChatMessage = { role: "assistant", content: "" };
      setMessagesByKey((prev) => {
        const prior = prev[key] || [];
        const last = prior[prior.length - 1];
        if (last?.role === "assistant" && !last.isError) {
          reportChatQualityEvent("chat_user_follow_up_after_assistant", {
            assistantId: selectedAssistant.id,
          });
        }
        return {
          ...prev,
          [key]: [...prior, userMsg, placeholder],
        };
      });

      cancelStreamReveal();
      streamStartedAtRef.current = Date.now();
      firstTokenReportedRef.current = false;
      userAbortRef.current = false;
      setStreamingKeys((prev) => new Set(prev).add(key));

      reportChatQualityEvent("chat_stream_started", {
        assistantId: selectedAssistant.id,
        messageSource: options?.messageSource,
      });

      const clientAttemptId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const body: {
        conversationId?: string;
        assistantId: string;
        message: string;
        preferences?: Record<string, string>;
        projectId?: string;
        messageSource?: ClientMessageSource;
        skipExtraction?: boolean;
        clientAttemptId?: string;
        priorChatRequestId?: string;
        studioSnapshot?: StudioSnapshotPayload;
        clientSurface?: ClientSurface;
        attachments?: ChatAttachmentPayload[];
      } = {
        message: userContent,
        assistantId: selectedAssistant.id,
        clientAttemptId,
        preferences:
          currentPreferences && Object.keys(currentPreferences).length > 0
            ? currentPreferences
            : undefined,
      };
      if (options?.studioSnapshot) {
        body.studioSnapshot = options.studioSnapshot;
      }
      if (options?.clientSurface) {
        body.clientSurface = options.clientSurface;
      }
      if (options?.attachments?.length) {
        body.attachments = options.attachments;
      }
      if (options?.messageSource) {
        body.messageSource = options.messageSource;
      }
      if (options?.skipExtraction === true) {
        body.skipExtraction = true;
      }
      if (options?.priorChatRequestId) {
        body.priorChatRequestId = options.priorChatRequestId;
      }
      const convoId = conversationIds[key];
      if (convoId) body.conversationId = convoId;
      else if (activeProjectCtx?.activeProjectId) {
        body.projectId = activeProjectCtx.activeProjectId;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      streamingKeyRef.current = key;
      /** Key used for streamingKeys / UI; updates when server migrates to `convo-*`. */
      let streamOwnerKey = key;
      const streamTimeoutId = window.setTimeout(() => {
        controller.abort();
      }, CHAT_STREAM_TIMEOUT_MS);

      fetch(API_ROUTES.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        /** Same-origin session + guest-session cookies as `apiPost` / `sameOriginFetch`. */
        credentials: "include",
        cache: "no-store",
      })
        .then(async (response) => {
          const newConvoId = response.headers.get(
            CHAT_OUTBOUND_HTTP.CONVERSATION_ID,
          );
          const userMessageId = response.headers.get(
            CHAT_OUTBOUND_HTTP.USER_MESSAGE_ID,
          );
          const costWarning = response.headers.get(
            CHAT_OUTBOUND_HTTP.COST_WARNING,
          );
          const chatRequestIdHeader =
            response.headers.get(CHAT_RESPONSE_HEADER.REQUEST_ID) ?? undefined;
          const headerFailureCategory = parseFailureCategoryHeader(
            response.headers,
          );
          if (costWarning) {
            toast.warning(
              "This conversation is nearing its usage limit. Consider starting a new one soon.",
              { id: "cost-warning", duration: 8000 },
            );
          }
          let effectiveKey = key;
          if (newConvoId) {
            // When this is a new conversation (key not already convo-*), migrate to convo-xxx and add to Recents
            if (!key.startsWith("convo-") && onNewConversation) {
              effectiveKey = `convo-${newConvoId}`;
              streamOwnerKey = effectiveKey;
              setMessagesByKey((prev) => ({
                ...prev,
                [effectiveKey]: prev[key] ?? [],
              }));
              setConversationIds((prev) => ({
                ...prev,
                [effectiveKey]: newConvoId,
              }));
              setStreamingKeys((prev) => {
                const next = new Set(prev);
                next.delete(key);
                next.add(effectiveKey);
                return next;
              });
              setProposalsByKey((prev) =>
                prev[key] ? { ...prev, [effectiveKey]: prev[key] } : prev,
              );
              streamingKeyRef.current = effectiveKey;
              onNewConversation(
                key,
                newConvoId,
                activeProjectCtx?.activeProjectId ?? null,
              );
            } else {
              setConversationIds((prev) => ({ ...prev, [key]: newConvoId }));
            }
          }
          if (!response.ok) {
            cancelStreamReveal();
            reportChatQualityEvent("chat_stream_failed", {
              reason: "http_error",
              status: response.status,
              assistantId: selectedAssistant.id,
              chatRequestId: chatRequestIdHeader,
              generationFailureCategory:
                headerFailureCategory ??
                (response.status === 503
                  ? CHAT_GENERATION_FAILURE.LLM_UNAVAILABLE_HTTP
                  : undefined),
            });
            const err = await response
              .json()
              .catch(() => ({ error: response.statusText }));
            const errBody = err as {
              error?: string | { code?: string; message?: string };
            };
            const errCode =
              typeof errBody.error === "object"
                ? errBody.error?.code
                : undefined;
            const errText =
              typeof errBody.error === "string"
                ? errBody.error
                : (errBody.error?.message ??
                  "Something went wrong. Try again.");
            const errorType = classifyError(response.status, errCode, errText);
            const errorMsg = makeErrorMessage(errText, errorType, {
              chatRequestId: chatRequestIdHeader,
              clientAttemptId,
              generationFailureCategory:
                headerFailureCategory ??
                (response.status === 503
                  ? CHAT_GENERATION_FAILURE.LLM_UNAVAILABLE_HTTP
                  : undefined),
            });
            setMessagesByKey((prev) => {
              const list = prev[effectiveKey] || [];
              const last = list[list.length - 1];
              if (last?.role === "assistant") {
                return {
                  ...prev,
                  [effectiveKey]: [...list.slice(0, -1), errorMsg],
                };
              }
              return {
                ...prev,
                [effectiveKey]: [...list, errorMsg],
              };
            });
            return;
          }
          const reader = response.body?.getReader();
          if (!reader) {
            cancelStreamReveal();
            reportChatQualityEvent("chat_stream_failed", {
              reason: "no_reader",
              assistantId: selectedAssistant.id,
              chatRequestId: chatRequestIdHeader,
            });
            const noStreamMsg = makeErrorMessage(
              CHAT_FAILURE_NO_RESPONSE_STREAM,
              "generic",
              {
                chatRequestId: chatRequestIdHeader,
                clientAttemptId,
              },
            );
            setMessagesByKey((prev) => {
              const list = prev[effectiveKey] || [];
              const last = list[list.length - 1];
              if (last?.role === "assistant") {
                return {
                  ...prev,
                  [effectiveKey]: [...list.slice(0, -1), noStreamMsg],
                };
              }
              return {
                ...prev,
                [effectiveKey]: [...list, noStreamMsg],
              };
            });
            return;
          }
          const decoder = new TextDecoder();
          let acc = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            acc += decoder.decode(value, { stream: true });
            const content = sanitizeAssistantStreamDisplay(acc);
            streamRevealTargetRef.current = content;
            pumpStreamReveal(effectiveKey);
          }
          acc += decoder.decode();
          const flushedContent = sanitizeOutput(acc);
          const replyFailed = assistantReplyFailed(acc, flushedContent);
          const failureDisplay =
            flushedContent.trim() ||
            (acc.trim()
              ? CHAT_FAILURE_SANITIZATION_EMPTIED
              : CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED);

          if (replyFailed) {
            cancelStreamReveal();
            const inferredCategory =
              inferGenerationFailureCategoryFromDisplayContent(failureDisplay);
            reportChatQualityEvent("chat_stream_failed", {
              reason: "empty_or_sanitized_reply",
              assistantId: selectedAssistant.id,
              chatRequestId: chatRequestIdHeader,
              generationFailureCategory: inferredCategory,
            });
            setMessagesByKey((prev) => {
              const list = prev[effectiveKey] || [];
              const last = list[list.length - 1];
              if (last?.role === "assistant") {
                return {
                  ...prev,
                  [effectiveKey]: [
                    ...list.slice(0, -1),
                    {
                      ...last,
                      content: failureDisplay,
                      isError: true,
                      errorType: "empty_reply",
                      chatRequestId: chatRequestIdHeader,
                      clientAttemptId,
                      generationFailureCategory: inferredCategory,
                    },
                  ],
                };
              }
              return prev;
            });
          } else {
            await awaitRevealEquals(effectiveKey, flushedContent);
            setMessagesByKey((prev) => {
              const list = prev[effectiveKey] || [];
              const lastIdx = list.length - 1;
              if (lastIdx < 0 || list[lastIdx].role !== "assistant")
                return prev;
              const patch: Partial<ChatMessage> = {};
              if (chatRequestIdHeader)
                patch.chatRequestId = chatRequestIdHeader;
              if (clientAttemptId) patch.clientAttemptId = clientAttemptId;
              if (Object.keys(patch).length === 0) return prev;
              return {
                ...prev,
                [effectiveKey]: [
                  ...list.slice(0, lastIdx),
                  { ...list[lastIdx], ...patch },
                ],
              };
            });
            reportChatQualityEvent("chat_stream_completed", {
              latencyMs: Math.max(0, Date.now() - streamStartedAtRef.current),
              assistantId: selectedAssistant.id,
              messageSource: options?.messageSource,
              chatRequestId: chatRequestIdHeader,
            });
          }

          if (newConvoId) {
            apiPost<{
              entities?: { text: string; field: string; confidence: number }[];
              proposals?: Array<{
                field: string;
                value: string;
                confidence: number;
                changeId: string;
              }>;
            }>(API_ROUTES.extract, {
              conversationId: newConvoId,
              content: userContent,
              messageId: userMessageId ?? undefined,
              ...(options?.messageSource
                ? { messageSource: options.messageSource }
                : {}),
              ...(options?.skipExtraction === true
                ? { skipExtraction: true }
                : {}),
            })
              .then((data) => {
                if (data.entities?.length) {
                  const summary = data.entities
                    .map(
                      (e: { field: string; text: string }) =>
                        `${e.field}: ${e.text}`,
                    )
                    .join("; ");
                  if (replyFailed) {
                    toast.message(
                      `We could not generate Eva's reply, but your preferences were saved (${summary}).`,
                      { duration: 8000 },
                    );
                  } else {
                    toast.message(`Noted for your project: ${summary}`, {
                      duration: 5000,
                    });
                  }
                  setMessagesByKey((prev) => {
                    const list = prev[effectiveKey] || [];
                    const lastUserIdx = list
                      .map((m) => m.role)
                      .lastIndexOf("user");
                    if (lastUserIdx < 0) return prev;
                    const copy = [...list];
                    copy[lastUserIdx] = {
                      ...copy[lastUserIdx],
                      extractions: data.entities,
                    };
                    return { ...prev, [effectiveKey]: copy };
                  });
                }
                if (data.proposals?.length) {
                  setProposalsByKey((prev) => ({
                    ...prev,
                    [effectiveKey]: data.proposals!,
                  }));
                }
              })
              .catch(() => {
                /* extraction optional */
              });
          }

          if (newConvoId && onConversationTitleGenerated) {
            apiPost<{ title: string }>(
              API_ROUTES.conversationTitle(newConvoId),
              {},
            )
              .then((data) =>
                onConversationTitleGenerated(
                  effectiveKey,
                  newConvoId!,
                  data.title,
                ),
              )
              .catch(() => {
                /* title API optional */
              });
          }
          // Attach assistant message id so UI can show feedback
          if (newConvoId) {
            apiGet<{ messages?: { id: string }[] }>(
              API_ROUTES.conversation(newConvoId),
            )
              .then((data) => {
                const list = data.messages;
                const last = list?.length ? list[list.length - 1] : null;
                if (last?.id) {
                  setMessagesByKey((prev) => {
                    const msgs = prev[effectiveKey] || [];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
                      return {
                        ...prev,
                        [effectiveKey]: [
                          ...msgs.slice(0, lastIdx),
                          { ...msgs[lastIdx], id: last.id },
                        ],
                      };
                    }
                    return prev;
                  });
                }
              })
              .catch(() => {
                /* message id for feedback optional */
              });
          }
        })
        .catch((err) => {
          const targetKey = streamOwnerKey;
          if (err.name === "AbortError") {
            if (abortControllerRef.current !== controller) {
              /* Superseded by a newer send — do not clear reveal refs; the active stream owns them. */
              return;
            }
            if (userAbortRef.current) {
              userAbortRef.current = false;
              const partialRaw = streamRevealTargetRef.current;
              const partialDisplay = partialRaw.trim();
              cancelStreamReveal();
              reportChatQualityEvent("chat_stream_stopped_by_user", {
                partialChars: partialDisplay.length,
                assistantId: selectedAssistant.id,
              });
              setMessagesByKey((prev) => {
                const list = prev[targetKey] || [];
                const last = list[list.length - 1];
                if (last?.role !== "assistant") return prev;
                if (!partialDisplay) {
                  return { ...prev, [targetKey]: list.slice(0, -1) };
                }
                return {
                  ...prev,
                  [targetKey]: [
                    ...list.slice(0, -1),
                    {
                      ...last,
                      content: partialRaw,
                      stoppedByUser: true,
                    },
                  ],
                };
              });
              return;
            }
            cancelStreamReveal();
            reportChatQualityEvent("chat_stream_failed", {
              reason: "aborted_timeout",
              assistantId: selectedAssistant.id,
            });
            const msg = CHAT_FAILURE_STREAM_TIMEOUT;
            const errorMsg = makeErrorMessage(msg, "timeout");
            toast.error(msg);
            setMessagesByKey((prev) => {
              const list = prev[targetKey] || [];
              const last = list[list.length - 1];
              if (last?.role === "assistant") {
                return {
                  ...prev,
                  [targetKey]: [...list.slice(0, -1), errorMsg],
                };
              }
              return {
                ...prev,
                [targetKey]: [...list, errorMsg],
              };
            });
            return;
          }
          cancelStreamReveal();
          reportChatQualityEvent("chat_stream_failed", {
            reason: "fetch_error",
            assistantId: selectedAssistant.id,
            errorName: err instanceof Error ? err.name : "unknown",
          });
          const isNetwork =
            err instanceof TypeError &&
            (err.message?.includes("fetch") ?? true);
          const errorType: ChatErrorType = isNetwork ? "network" : "generic";
          const msg = isNetwork
            ? CHAT_FAILURE_FETCH_NETWORK
            : CHAT_FAILURE_FETCH_GENERIC;
          const errorMsg = makeErrorMessage(msg, errorType);
          toast.error(msg);
          setMessagesByKey((prev) => {
            const list = prev[targetKey] || [];
            const last = list[list.length - 1];
            if (last?.role === "assistant") {
              return {
                ...prev,
                [targetKey]: [...list.slice(0, -1), errorMsg],
              };
            }
            return {
              ...prev,
              [targetKey]: [...list, errorMsg],
            };
          });
        })
        .finally(() => {
          window.clearTimeout(streamTimeoutId);
          // If a newer /api/chat replaced this request, `abortControllerRef` points at the new
          // controller — do not strip the active stream's key or we strand `streamingKeys` and
          // the send button stays disabled forever.
          const supersededByNewSend =
            controller.signal.aborted &&
            abortControllerRef.current !== controller;
          if (!supersededByNewSend) {
            setStreamingKeys((prev) => {
              const next = new Set(prev);
              next.delete(streamOwnerKey);
              return next;
            });
          }
          if (abortControllerRef.current === controller) {
            streamingKeyRef.current = null;
          }
        });
    },
    [
      conversationIds,
      onConversationTitleGenerated,
      currentPreferences,
      onNewConversation,
      selectedAssistant.id,
      activeProjectCtx?.activeProjectId,
      cancelStreamReveal,
      pumpStreamReveal,
      awaitRevealEquals,
    ],
  );

  const loadConversation = useCallback(
    async (chatKey: string, dbConversationId: string) => {
      try {
        const data = await apiGet<{
          assistantId?: string | null;
          messages?: {
            id: string;
            role: string;
            content: string;
            extractions?: unknown;
          }[];
        }>(API_ROUTES.conversation(dbConversationId));
        if (data.assistantId != null && data.assistantId !== "") {
          setSelectedAssistant(
            assistantSummaryForClient(
              getAssistantById(normalizeAssistantId(data.assistantId)),
            ),
          );
        } else {
          setSelectedAssistant(DEFAULT_ASSISTANT);
        }
        const msgs: ChatMessage[] = (data.messages || []).map(
          (m: {
            id: string;
            role: string;
            content: string;
            extractions?: unknown;
          }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            extractions: m.extractions as ChatMessage["extractions"],
          }),
        );
        setMessagesByKey((prev) => ({ ...prev, [chatKey]: msgs }));
        setConversationIds((prev) => ({
          ...prev,
          [chatKey]: dbConversationId,
        }));
      } catch {
        toast.error("Failed to load conversation");
      }
    },
    [setSelectedAssistant],
  );

  const clearPendingMessage = useCallback(() => {
    if (onClearPendingMessage) onClearPendingMessage();
    else setInternalPending(null);
  }, [onClearPendingMessage]);

  const stopStreaming = useCallback((chatKey: string) => {
    if (streamingKeyRef.current !== chatKey) return;
    userAbortRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  const value: ChatContextValue = {
    messagesByKey,
    setMessagesByKey,
    sendMessage,
    proposalsByKey,
    dismissProposals,
    loadConversation,
    inputValue,
    setInputValue,
    pendingMessage,
    setPendingMessage: setPendingMessageState,
    clearPendingMessage,
    isStreamingForKey: (k) => streamingKeys.has(k),
    isStreaming: streamingKeys.size > 0,
    conversationIds,
    removeConversationData,
    stopStreaming,
    chatThreadPrimacy,
    setChatThreadPrimacy,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
