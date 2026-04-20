"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Paperclip, RotateCcw, Send, X } from "lucide-react";

import "@/app/(chromeless)/chatbot/eva-dashboard-theme.css";

import { ChatAvatar } from "@/components/eva-dashboard/chat/chat-avatar";
import { ChatBubble } from "@/components/eva-dashboard/chat/chat-bubble";
import { ConfirmationBanner } from "@/components/eva-dashboard/preferences/confirmation-banner";
import { Input } from "@/components/eva-dashboard/ui/input";
import {
  CurrentConversationProvider,
  useCurrentConversation,
} from "@/lib/eva-dashboard/contexts/current-conversation-context";
import {
  CurrentPreferencesProvider,
  useCurrentPreferences,
} from "@/lib/eva-dashboard/contexts/current-preferences-context";
import {
  ChatProvider,
  useChatContext,
} from "@/lib/eva-dashboard/contexts/chat-context";
import { EvaAssistantProvider } from "@/lib/eva-dashboard/contexts/eva-assistant-context";
import { useActiveProject } from "@/lib/eva-dashboard/contexts/active-project-context";
import { useStudioWorkspaceSnapshot } from "@/lib/eva-dashboard/contexts/studio-workspace-snapshot-context";
import { getLatestUserText } from "@/lib/eva-dashboard/chat/last-user-message-text";
import { studioRailChatKey } from "@/lib/eva-dashboard/chat/rail-chat-ids";
import { parseHighlightedContent } from "@/lib/eva-dashboard/parse-highlights";
import { cn } from "@/lib/utils";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import { apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import {
  CLIENT_SURFACE_STUDIO_RAIL,
  type AttachmentClientReadiness,
  type ChatAttachmentPayload,
} from "@/lib/eva/api/chat-attachment";
import { STUDIO_RAIL_IMAGE_ONLY_MESSAGE_PLACEHOLDER } from "@/lib/eva-dashboard/chat/studio-rail-chat-constants";
import { uploadStudioChatImageArtifact } from "@/lib/eva-dashboard/chat/studio-chat-image-upload";
import { CHAT_IMAGE_FILE_INPUT_ACCEPT } from "@/lib/upload/chat-image-mime-types";
import { toast } from "sonner";
import { isAssistantBubbleFailureState } from "@/lib/eva/core/chat-copy";

type StudioRailQueuedImage = {
  localId: string;
  clientReadiness: AttachmentClientReadiness;
  url?: string;
  mimeType?: string;
  label?: string;
  fileRecordId?: string;
  errorMessage?: string;
};

const MAX_STUDIO_RAIL_IMAGES = 2;

const STUDIO_QUICK_PROMPTS = [
  "Does my current room size fit this layout?",
  "What should I change in my prompt for a warmer look?",
  "How do these placed pieces read for flow?",
];

function studioFollowUpChips(lastUserText: string): string[] {
  const lower = lastUserText.toLowerCase();
  if (lower.includes("budget") || lower.includes("$")) {
    return [
      "Where should I save vs. splurge for this room?",
      "Cheaper alternatives with the same vibe?",
    ];
  }
  if (lower.includes("wood") || lower.includes("oak")) {
    return [
      "How do I mix wood tones without clashing?",
      "Finish options that stay low-maintenance?",
    ];
  }
  return [
    "Critique my current Studio layout.",
    "Suggest one change to the prompt for clarity.",
  ];
}

export function StudioRailChatInner() {
  const { activeProjectId, activeProject } = useActiveProject();
  const studioSnapshot = useStudioWorkspaceSnapshot();
  const {
    messagesByKey,
    setMessagesByKey,
    sendMessage,
    isStreamingForKey,
    inputValue,
    setInputValue,
    conversationIds,
    loadConversation,
    removeConversationData,
    proposalsByKey,
    dismissProposals,
  } = useChatContext();
  const { setConversationId } = useCurrentConversation();
  const { refreshPreferences } = useCurrentPreferences();

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queuedImages, setQueuedImages] = useState<StudioRailQueuedImage[]>([]);
  const chatKey = useMemo(
    () => studioRailChatKey(activeProjectId),
    [activeProjectId],
  );

  const studioSendBase = useMemo(
    () => ({
      studioSnapshot: studioSnapshot ?? undefined,
      clientSurface: CLIENT_SURFACE_STUDIO_RAIL,
    }),
    [studioSnapshot],
  );

  const messages = messagesByKey[chatKey] ?? [];
  const streaming = isStreamingForKey(chatKey);
  const lastUserText = getLatestUserText(messages);
  const suggestionChips = useMemo(
    () => studioFollowUpChips(lastUserText),
    [lastUserText],
  );
  const lastMsg = messages[messages.length - 1];
  const showFollowUpChips =
    messages.length > 0 &&
    !streaming &&
    lastMsg?.role === "assistant" &&
    (Boolean(lastMsg.content?.trim()) || Boolean(lastMsg.isError));

  const currentConvoId =
    conversationIds[chatKey] ??
    (chatKey.startsWith("convo-") ? chatKey.replace("convo-", "") : null);

  const lastMessageContent = messages[messages.length - 1]?.content;

  const persistedConvoId = activeProject?.activeConversationId ?? null;
  const loadedPairRef = useRef<string | null>(null);

  useEffect(() => {
    setConversationId(currentConvoId);
  }, [currentConvoId, setConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastMessageContent]);

  useEffect(() => {
    const pair = `${chatKey}|${persistedConvoId ?? ""}`;
    if (persistedConvoId) {
      if (loadedPairRef.current !== pair) {
        loadedPairRef.current = pair;
        void loadConversation(chatKey, persistedConvoId);
      }
    } else {
      loadedPairRef.current = null;
      removeConversationData(chatKey);
      setConversationId(null);
    }
  }, [
    chatKey,
    persistedConvoId,
    loadConversation,
    removeConversationData,
    setConversationId,
  ]);

  useEffect(() => {
    const onFocus = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", onFocus);
    return () => window.removeEventListener("focus-chat-input", onFocus);
  }, []);

  const removeQueuedImage = (localId: string) => {
    setQueuedImages((previous) =>
      previous.filter((row) => row.localId !== localId),
    );
  };

  const processStudioImageFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    if (!currentConvoId) {
      toast.error(
        "Send a message first so this thread has an id — then you can attach images.",
      );
      return;
    }
    const remainingSlots = MAX_STUDIO_RAIL_IMAGES - queuedImages.length;
    if (remainingSlots <= 0) {
      toast.error(`At most ${MAX_STUDIO_RAIL_IMAGES} images in the queue.`);
      return;
    }
    const files = Array.from(fileList).slice(0, remainingSlots);
    for (const file of files) {
      const localId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setQueuedImages((previous) => [
        ...previous,
        {
          localId,
          clientReadiness: "analyzing",
          label: file.name || "Image",
        },
      ]);
      void uploadStudioChatImageArtifact({
        conversationId: currentConvoId,
        file,
      }).then((result) => {
        if (result.ok) {
          setQueuedImages((previous) =>
            previous.map((row) =>
              row.localId === localId
                ? {
                    ...row,
                    clientReadiness: "ready",
                    url: result.url,
                    mimeType: result.mimeType,
                    fileRecordId: result.fileRecordId,
                    label: result.filename,
                  }
                : row,
            ),
          );
        } else {
          const readiness: AttachmentClientReadiness =
            result.reason === "unsupported_type" ? "unsupported" : "failed";
          setQueuedImages((previous) =>
            previous.map((row) =>
              row.localId === localId
                ? {
                    ...row,
                    clientReadiness: readiness,
                    errorMessage: result.message,
                  }
                : row,
            ),
          );
          toast.error(result.message);
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRetry = () => {
    const list = messagesByKey[chatKey] ?? [];
    const lastIdx = list.length - 1;
    if (lastIdx < 1) return;
    const last = list[lastIdx];
    const prev = list[lastIdx - 1];
    if (
      last.role !== "assistant" ||
      prev.role !== "user" ||
      !isAssistantBubbleFailureState(last)
    )
      return;
    if (last.errorType === "cost_limit") return;
    if (streaming) return;
    const userContent = prev.content;
    setMessagesByKey((prevState) => ({
      ...prevState,
      [chatKey]: list.slice(0, -2),
    }));
    sendMessage(chatKey, userContent, {
      ...studioSendBase,
      priorChatRequestId: last.chatRequestId,
      ...(prev.chatAttachments?.length
        ? { attachments: prev.chatAttachments }
        : {}),
    });
  };

  const handleSend = () => {
    if (streaming) return;
    const text = inputValue.trim();
    const pendingLifecycle = queuedImages.some(
      (row) =>
        row.clientReadiness === "uploaded" ||
        row.clientReadiness === "analyzing",
    );
    if (pendingLifecycle) {
      toast.error("Wait for image upload to finish before sending.");
      return;
    }
    const readyPayloads: ChatAttachmentPayload[] = queuedImages
      .filter((row) => row.clientReadiness === "ready" && row.url)
      .map((row) => ({
        kind: "image_url" as const,
        url: row.url!,
        mimeType: row.mimeType,
        clientReadiness: "ready" as const,
        label: row.label,
        localId: row.localId,
        ...(row.fileRecordId ? { fileRecordId: row.fileRecordId } : {}),
      }));
    if (!text && readyPayloads.length === 0) return;
    const messageBody =
      text.length > 0
        ? text
        : readyPayloads.length > 0
          ? STUDIO_RAIL_IMAGE_ONLY_MESSAGE_PLACEHOLDER
          : "";
    if (messageBody.length === 0) return;
    sendMessage(chatKey, messageBody, {
      ...studioSendBase,
      ...(readyPayloads.length > 0 ? { attachments: readyPayloads } : {}),
    });
    setInputValue("");
    setQueuedImages([]);
  };

  const trustLine = useMemo(() => {
    const parts: string[] = [];
    if (activeProjectId && activeProject?.title) {
      parts.push(`Project: ${activeProject.title}`);
    } else if (activeProjectId) {
      parts.push("Project linked");
    } else {
      parts.push("No project — pick one to persist threads");
    }
    if (studioSnapshot?.designIntent.prompt?.trim()) {
      parts.push("Studio prompt on record");
    }
    if (
      studioSnapshot?.assets.referenceImages.some((a) => Boolean(a.url)) ||
      studioSnapshot?.assets.generatedImages.some((a) => Boolean(a.url))
    ) {
      parts.push("Reference / result imagery listed");
    }
    return parts.join(" · ");
  }, [activeProjectId, activeProject, studioSnapshot]);

  return (
    <div className="eva-dashboard-root text-foreground flex min-h-0 flex-1 flex-col bg-white">
      <p
        className="text-muted-foreground border-border border-b px-3 py-1.5 text-[10px] leading-snug"
        title={trustLine}
      >
        {trustLine}
      </p>
      <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center px-2 py-4 text-center">
            <ChatAvatar role="assistant" initial="E" size="md" />
            <p className="text-foreground mt-3 text-sm font-semibold">
              Ask Eva about this Studio session
            </p>
            <p className="text-muted-foreground mt-1 max-w-[260px] text-xs leading-relaxed">
              Same assistant as the full workspace — grounded in your layout and
              prompts when shown above.
            </p>
            <div className="mt-4 flex w-full flex-col gap-2">
              {STUDIO_QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (streaming) return;
                    sendMessage(chatKey, prompt, {
                      ...studioSendBase,
                      messageSource: "quick_suggestion",
                    });
                  }}
                  className="border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 rounded-lg border px-3 py-2 text-left text-xs leading-snug transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <Link
              href={WORKFLOW_ROUTES.assistant}
              className="text-primary mt-4 text-xs font-medium underline-offset-4 hover:underline"
            >
              Open full Eva workspace
            </Link>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={(msg as { id?: string }).id ?? i}
                className={cn(
                  "flex w-full min-w-0 gap-2",
                  isUser ? "flex-row-reverse" : "",
                )}
              >
                <ChatAvatar
                  role={isUser ? "user" : "assistant"}
                  initial={isUser ? "Y" : "E"}
                  size="sm"
                />
                <div
                  className={cn(
                    "flex min-w-0 flex-col gap-1",
                    isUser ? "items-end" : "items-start",
                  )}
                >
                  <ChatBubble
                    role={isUser ? "user" : "assistant"}
                    size="sm"
                    className={
                      !isUser && msg.isError
                        ? "border-destructive/25 bg-destructive/10 text-destructive"
                        : undefined
                    }
                  >
                    {isUser ? (
                      <span className="inline-flex flex-col items-end gap-0.5">
                        <span>{msg.content}</span>
                        {msg.attachmentReadiness &&
                          msg.attachmentReadiness.length > 0 && (
                            <span
                              className="text-muted-foreground max-w-[200px] truncate text-[9px] leading-none opacity-80"
                              title={msg.attachmentReadiness
                                .map(
                                  (row) =>
                                    `${row.label ?? "file"}: ${row.clientReadiness}`,
                                )
                                .join(" · ")}
                            >
                              {msg.attachmentReadiness
                                .map((row) => row.clientReadiness)
                                .join(", ")}
                            </span>
                          )}
                      </span>
                    ) : msg.content === "" &&
                      streaming &&
                      i === messages.length - 1 ? (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                      </span>
                    ) : (
                      parseHighlightedContent(msg.content)
                    )}
                  </ChatBubble>
                  {!isUser &&
                    msg.content &&
                    isAssistantBubbleFailureState(msg) && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={streaming}
                        className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                    )}
                </div>
              </div>
            );
          })
        )}
        {showFollowUpChips && (
          <div className="border-border mt-2 border-t border-dashed pt-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
              Try next
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestionChips.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (streaming) return;
                    sendMessage(chatKey, label, {
                      ...studioSendBase,
                      messageSource: "quick_suggestion",
                    });
                  }}
                  className="border-border bg-card text-foreground/90 hover:border-primary/45 hover:bg-primary/5 max-w-full cursor-pointer rounded-full border px-2.5 py-1 text-left text-[11px] leading-snug break-words transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
        {proposalsByKey[chatKey]?.length > 0 && currentConvoId && (
          <ConfirmationBanner
            proposals={proposalsByKey[chatKey]}
            onAutoDismiss={() => dismissProposals(chatKey)}
            onAccept={(changeId) => {
              void apiPost(
                API_ROUTES.conversationPreferencesConfirm(currentConvoId),
                { changeId },
              )
                .then(async () => {
                  dismissProposals(chatKey, changeId);
                  toast.success("Preference confirmed");
                  await refreshPreferences(currentConvoId);
                })
                .catch(() => toast.error("Failed to confirm"));
            }}
            onReject={(changeId) => {
              void apiPost(
                API_ROUTES.conversationPreferencesReject(currentConvoId),
                { changeId },
              )
                .then(async () => {
                  dismissProposals(chatKey, changeId);
                  toast.success("Preference rejected");
                  await refreshPreferences(currentConvoId);
                })
                .catch(() => toast.error("Failed to reject"));
            }}
          />
        )}
      </div>

      <div className="border-border shrink-0 border-t bg-white px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={CHAT_IMAGE_FILE_INPUT_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => processStudioImageFiles(event.target.files)}
        />
        {queuedImages.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {queuedImages.map((row) => (
              <span
                key={row.localId}
                className="border-border bg-muted/40 text-muted-foreground inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[9px]"
                title={row.errorMessage ?? row.url}
              >
                {row.clientReadiness === "analyzing" ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                ) : null}
                <span className="max-w-[120px] truncate">
                  {row.label ?? "Image"} · {row.clientReadiness}
                </span>
                <button
                  type="button"
                  className="text-foreground/70 hover:text-foreground shrink-0 p-0.5"
                  aria-label="Remove queued image"
                  onClick={() => removeQueuedImage(row.localId)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="border-border bg-muted/30 focus-within:border-primary/50 focus-within:ring-primary/20 flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-all focus-within:ring-2">
          <button
            type="button"
            disabled={
              streaming ||
              !currentConvoId ||
              queuedImages.length >= MAX_STUDIO_RAIL_IMAGES
            }
            title={
              !currentConvoId
                ? "Send a message first to create a thread, then attach images."
                : "Attach image"
            }
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer rounded p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Attach image"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <Input
            ref={chatInputRef}
            placeholder="Message Eva…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[36px] min-w-0 flex-1 rounded-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={
              streaming ||
              (!inputValue.trim() &&
                !queuedImages.some((row) => row.clientReadiness === "ready"))
            }
            className="bg-primary text-primary-foreground shrink-0 cursor-pointer rounded-md p-2 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Providers for Studio image-gen route — mirrors marketing rail stack. */
export function StudioRailChatProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EvaAssistantProvider>
      <CurrentConversationProvider>
        <CurrentPreferencesProvider>
          <ChatProvider>{children}</ChatProvider>
        </CurrentPreferencesProvider>
      </CurrentConversationProvider>
    </EvaAssistantProvider>
  );
}
