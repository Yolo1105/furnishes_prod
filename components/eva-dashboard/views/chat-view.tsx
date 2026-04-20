"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  MessageSquarePlus,
  Send,
  Paperclip,
  Lightbulb,
  Check,
  Edit3,
  Home,
  Briefcase,
  Moon,
  Sun,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Square,
} from "lucide-react";
import { getChatSuggestionCardsForAssistant } from "@/lib/eva-dashboard/chat-starter-cards";
import { reportChatQualityEvent } from "@/lib/eva-dashboard/chat-quality-telemetry";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useEvaAssistant } from "@/lib/eva-dashboard/contexts/eva-assistant-context";
import { useChatContext } from "@/lib/eva-dashboard/contexts/chat-context";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useCurrentPreferences } from "@/lib/eva-dashboard/contexts/current-preferences-context";
import { parseHighlightedContent } from "@/lib/eva-dashboard/parse-highlights";
import type { ChatMessage } from "@/lib/eva-dashboard/types";
import { cn } from "@/lib/utils";
import { apiPost, apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { toast } from "sonner";
import { isAssistantBubbleFailureState } from "@/lib/eva/core/chat-copy";
import { ChatBubble } from "@/components/eva-dashboard/chat/chat-bubble";
import {
  CHAT_MAIN_GUTTER_X_CLASS,
  CHAT_MAIN_SCROLL_CLASS,
  CHAT_READABLE_BODY_MAX_CLASS,
} from "@/components/eva-dashboard/chat/chat-layout-classes";
import { ChatAvatar } from "@/components/eva-dashboard/chat/chat-avatar";
import { Input } from "@/components/eva-dashboard/ui/input";
import { ConfirmationBanner } from "@/components/eva-dashboard/preferences/confirmation-banner";
import { ReviewPrompt } from "@/components/eva-dashboard/preferences/review-prompt";

function iconForStarterCard(id: string) {
  if (id === "living-room") return Home;
  if (id === "home-office") return Briefcase;
  if (id === "bedroom") return Moon;
  return Sun;
}

export function ChatView() {
  const { activeItem, refreshConversationTitle } = useAppContext();
  const { selectedAssistant } = useEvaAssistant();

  const chatSuggestionCardsWithIcons = useMemo(
    () =>
      getChatSuggestionCardsForAssistant(selectedAssistant.id).map((card) => ({
        ...card,
        icon: iconForStarterCard(card.id),
      })),
    [selectedAssistant.id],
  );
  const {
    messagesByKey,
    setMessagesByKey,
    sendMessage,
    stopStreaming,
    isStreamingForKey,
    loadConversation,
    inputValue,
    setInputValue,
    pendingMessage,
    clearPendingMessage,
    isStreaming,
    conversationIds,
    proposalsByKey,
    dismissProposals,
    setChatThreadPrimacy,
  } = useChatContext();
  const bottomRef = useRef<HTMLDivElement>(null);

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
    // Don't retry cost limit errors — retrying won't help.
    if (last.errorType === "cost_limit") return;
    if (isStreamingForKey(chatKey)) return;
    const priorChatRequestId = last.chatRequestId;
    reportChatQualityEvent("chat_retry_clicked", {
      assistantId: selectedAssistant.id,
      priorChatRequestId,
    });
    const userContent = prev.content;
    setMessagesByKey((prevState) => ({
      ...prevState,
      [chatKey]: list.slice(0, -2),
    }));
    sendMessage(chatKey, userContent, {
      ...(priorChatRequestId ? { priorChatRequestId } : {}),
      ...(prev.chatAttachments?.length
        ? { attachments: prev.chatAttachments }
        : {}),
    });
  };
  // Prefer sidebar selection: when user clicked a conversation tab, show that conversation.
  const chatKey =
    activeItem.startsWith("recent-") || activeItem.startsWith("convo-")
      ? activeItem
      : activeItem === "new-chat"
        ? "new-chat"
        : "default";
  const isStreamingThisChat = isStreamingForKey(chatKey);
  const { setConversationId } = useCurrentConversation();
  const { preferences, refreshPreferences } = useCurrentPreferences();
  const [reviewShownAtByKey, setReviewShownAtByKey] = useState<
    Record<string, number[]>
  >({});
  const REVIEW_INTERVAL = 10;

  const [feedbackSent, setFeedbackSent] = useState<
    Record<string, "positive" | "negative">
  >({});
  const [adjustState, setAdjustState] = useState<{
    messageIndex: number;
    field: string;
    value: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const chatMessages = messagesByKey[chatKey] || [];
  const messagesToShow = chatMessages;

  useEffect(() => {
    const active =
      chatMessages.length > 0 || isStreamingThisChat || isStreaming;
    setChatThreadPrimacy(active);
    return () => setChatThreadPrimacy(false);
  }, [
    chatMessages.length,
    isStreamingThisChat,
    isStreaming,
    setChatThreadPrimacy,
  ]);

  const currentConvoId = useMemo(
    () =>
      conversationIds[chatKey] ??
      (chatKey.startsWith("convo-") ? chatKey.replace("convo-", "") : null),
    [chatKey, conversationIds],
  );
  const preferenceProposalCount = proposalsByKey[chatKey]?.length ?? 0;
  const showReviewPrompt =
    messagesToShow.length >= REVIEW_INTERVAL &&
    messagesToShow.length % REVIEW_INTERVAL === 0 &&
    !(reviewShownAtByKey[chatKey] ?? []).includes(messagesToShow.length) &&
    preferenceProposalCount === 0 &&
    !isStreamingThisChat;

  useEffect(() => {
    if (!showReviewPrompt) return;
    reportChatQualityEvent("chat_review_prompt_shown", {
      assistantId: selectedAssistant.id,
      atMessageCount: messagesToShow.length,
    });
  }, [showReviewPrompt, selectedAssistant.id, messagesToShow.length]);

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Mood image",
    "Floorplan",
    "Color palette",
    "Cozy living room",
    "Small bedroom",
    "Minimalist tips",
    "Lighting ideas",
  ]);

  useEffect(() => {
    if (
      (activeItem === "new-chat" ||
        activeItem.startsWith("recent-") ||
        activeItem.startsWith("convo-")) &&
      pendingMessage
    ) {
      setInputValue(pendingMessage);
      clearPendingMessage();
    }
  }, [pendingMessage, activeItem, setInputValue, clearPendingMessage]);

  useEffect(() => {
    if (chatKey.startsWith("convo-") && chatMessages.length === 0) {
      const dbId = chatKey.replace("convo-", "");
      loadConversation(chatKey, dbId);
    }
  }, [chatKey, chatMessages.length, loadConversation]);

  useEffect(() => {
    setConversationId(currentConvoId);
  }, [currentConvoId, setConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isStreamingThisChat ? "auto" : "smooth",
    });
  }, [
    messagesToShow.length,
    messagesToShow[messagesToShow.length - 1]?.content,
    isStreamingThisChat,
  ]);

  useEffect(() => {
    if (!isStreaming && currentConvoId && chatMessages.length > 2) {
      const timer = setTimeout(() => {
        apiPost<{ suggestions?: string[] }>(API_ROUTES.suggestions, {
          conversationId: currentConvoId,
        })
          .then(
            (data) =>
              data.suggestions?.length && setSuggestions(data.suggestions),
          )
          .catch(() => {
            /* optional API — keep quiet to avoid Next dev overlay on console.error */
          });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, currentConvoId, selectedAssistant.id]);

  const handleSendChatMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage(chatKey, inputValue.trim());
    setInputValue("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const useR2 =
      process.env.NEXT_PUBLIC_USE_R2_UPLOADS === "1" && Boolean(currentConvoId);

    const appendUrlToInput = (url: string) => {
      setInputValue(
        (prev) => (prev ? `${prev} ` : "") + `I've attached an image: ${url}`,
      );
    };

    try {
      if (useR2) {
        const mime = file.type || "application/octet-stream";
        const signRes = await fetch(API_ROUTES.uploadsSign, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prefix: "uploads",
            filename: file.name,
            mimeType: mime,
            sizeBytes: file.size,
            conversationId: currentConvoId,
          }),
        });
        if (!signRes.ok) {
          const err = (await signRes.json().catch(() => ({}))) as {
            message?: string;
            error?: string;
          };
          throw new Error(err.message ?? err.error ?? "sign failed");
        }
        const signed = (await signRes.json()) as {
          uploadUrl: string;
          storageKey: string;
        };
        const putRes = await fetch(signed.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": mime },
        });
        if (!putRes.ok) {
          throw new Error(`storage PUT failed (${putRes.status})`);
        }
        const confRes = await fetch(API_ROUTES.uploadsConfirm, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storageKey: signed.storageKey,
            conversationId: currentConvoId,
            filename: file.name,
          }),
        });
        if (!confRes.ok) {
          const errBody = (await confRes.json().catch(() => ({}))) as {
            error?: { message?: string } | string;
          };
          const msg =
            typeof errBody.error === "object" && errBody.error?.message
              ? errBody.error.message
              : typeof errBody.error === "string"
                ? errBody.error
                : "confirm failed";
          throw new Error(msg);
        }
        const data = (await confRes.json()) as { url?: string };
        if (data.url) appendUrlToInput(data.url);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      if (currentConvoId) formData.append("conversationId", currentConvoId);
      const res = await fetch(API_ROUTES.upload, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setInputValue(
          (prev) =>
            prev +
            (prev ? " " : "") +
            `[Upload failed: ${(err as { error?: string }).error ?? "unknown"}]`,
        );
        return;
      }
      const data = (await res.json()) as { url?: string; filename?: string };
      if (data.url) appendUrlToInput(data.url);
    } catch (err) {
      setInputValue(
        (prev) =>
          prev +
          (prev ? " " : "") +
          `[Upload failed: ${err instanceof Error ? err.message : "unknown"}]`,
      );
    }
  };

  const handleSuggestionClick = (
    card: (typeof chatSuggestionCardsWithIcons)[0],
  ) => {
    reportChatQualityEvent("chat_starter_card_sent", {
      cardId: card.id,
      assistantId: selectedAssistant.id,
    });
    const userContent = `I'd like help with ${card.title}. ${card.description}`;
    sendMessage(chatKey, userContent, {
      messageSource: "quick_suggestion",
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col space-y-4 overflow-x-hidden overflow-y-auto",
          CHAT_MAIN_SCROLL_CLASS,
        )}
      >
        {messagesToShow.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center py-6 sm:py-10">
            <div className="mb-4 flex justify-center">
              <ChatAvatar
                role="assistant"
                initial={selectedAssistant.name.charAt(0)}
                size="lg"
              />
            </div>
            <h2 className="text-foreground mb-2 text-center text-xl font-semibold">
              How can I help you today?
            </h2>
            <p
              className={cn(
                "text-muted-foreground mx-auto mb-8 text-center text-sm leading-relaxed",
                CHAT_READABLE_BODY_MAX_CLASS,
              )}
            >
              You&apos;re chatting with {selectedAssistant.name} —{" "}
              {selectedAssistant.tagline}. Pick a room to start, or describe
              your space in your own words.
            </p>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {chatSuggestionCardsWithIcons.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => handleSuggestionClick(card)}
                    className="border-border bg-card hover:border-primary/50 hover:bg-primary/5 flex cursor-pointer flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-all duration-200"
                  >
                    <Icon className="text-muted-foreground h-5 w-5" />
                    <span className="text-foreground text-sm font-semibold">
                      {card.title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {card.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messagesToShow.map((msg, i) => {
            const isUser = msg.role === "user";
            const messageId = (msg as { id?: string }).id;
            const hasFeedback = messageId && !isUser;
            const sent = messageId ? feedbackSent[messageId] : null;
            return (
              <div
                key={messageId ?? i}
                className={cn(
                  "flex w-full min-w-0 gap-2.5",
                  isUser ? "flex-row-reverse" : "",
                )}
              >
                <ChatAvatar
                  role={isUser ? "user" : "assistant"}
                  initial={isUser ? "Y" : "E"}
                  size="md"
                />
                <div
                  className={cn(
                    "flex min-w-0 flex-1 flex-col gap-1",
                    isUser ? "items-end" : "items-start",
                  )}
                >
                  <ChatBubble
                    role={isUser ? "user" : "assistant"}
                    size="md"
                    className={
                      !isUser && msg.isError
                        ? "border-destructive/25 bg-destructive/10 text-destructive"
                        : undefined
                    }
                  >
                    {isUser ? (
                      msg.content
                    ) : msg.content === "" &&
                      isStreamingThisChat &&
                      i === messagesToShow.length - 1 ? (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                      </span>
                    ) : (
                      parseHighlightedContent(msg.content)
                    )}
                  </ChatBubble>
                  {!isUser && msg.stoppedByUser ? (
                    <p
                      className={cn(
                        "text-muted-foreground text-[11px] leading-snug",
                        CHAT_READABLE_BODY_MAX_CLASS,
                      )}
                    >
                      <span className="text-foreground/80 font-medium">
                        Stopped.
                      </span>{" "}
                      Your partial reply is kept above—send another message to
                      continue.
                    </p>
                  ) : null}
                  {!isUser &&
                    msg.content &&
                    isAssistantBubbleFailureState(msg) && (
                      <div className="mt-1.5 flex items-center gap-2">
                        {msg.errorType === "cost_limit" ? (
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new Event("start-new-chat"));
                            }}
                            className="border-primary/25 bg-primary/8 text-primary hover:bg-primary/12 inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                          >
                            <MessageSquarePlus className="h-3 w-3" /> New
                            Conversation
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRetry}
                            disabled={isStreamingThisChat}
                            className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" /> Try again
                          </button>
                        )}
                      </div>
                    )}
                  {hasFeedback && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!messageId || sent) return;
                          apiPost(API_ROUTES.messageFeedback(messageId), {
                            rating: "positive",
                          })
                            .then(() =>
                              setFeedbackSent((prev) => ({
                                ...prev,
                                [messageId]: "positive",
                              })),
                            )
                            .catch(() =>
                              toast.error("Failed to send feedback"),
                            );
                        }}
                        className={cn(
                          "text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded p-1 transition-colors disabled:opacity-50",
                          sent === "positive" && "text-primary",
                        )}
                        disabled={!!sent}
                        title="Good response"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!messageId || sent) return;
                          apiPost(API_ROUTES.messageFeedback(messageId), {
                            rating: "negative",
                          })
                            .then(() =>
                              setFeedbackSent((prev) => ({
                                ...prev,
                                [messageId]: "negative",
                              })),
                            )
                            .catch(() =>
                              toast.error("Failed to send feedback"),
                            );
                        }}
                        className={cn(
                          "text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded p-1 transition-colors disabled:opacity-50",
                          sent === "negative" && "text-primary",
                        )}
                        disabled={!!sent}
                        title="Bad response"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {isUser &&
                    (msg.extractions?.length ? (
                      <div className="flex max-w-[min(100%,22rem)] flex-col items-end gap-1">
                        {(() => {
                          const ex = msg.extractions!;
                          const pending = ex.filter((e) => e.needsConfirmation);
                          const hasQuietOnly = pending.length === 0;
                          if (hasQuietOnly) {
                            return (
                              <p className="text-muted-foreground/50 text-[9px] leading-snug">
                                Noted for your brief.
                              </p>
                            );
                          }
                          const hasAuto = ex.some((e) => !e.needsConfirmation);
                          return (
                            <>
                              {hasAuto ? (
                                <p className="text-muted-foreground/55 max-w-full text-right text-[9px] leading-snug">
                                  Saved some details—tap a tag below if you want
                                  to confirm.
                                </p>
                              ) : null}
                              <div className="flex flex-wrap justify-end gap-0.5">
                                {pending.map((e, j) => (
                                  <span
                                    key={j}
                                    className="border-border/40 bg-muted/20 text-muted-foreground/90 rounded border px-1.5 py-0.5 text-[9px] leading-tight"
                                  >
                                    {e.text}
                                  </span>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                        {msg.extractions?.some((e) => e.needsConfirmation) &&
                          currentConvoId &&
                          (() => {
                            const first = msg.extractions?.find(
                              (e) => e.needsConfirmation && e.confirmMessage,
                            );
                            if (!first) return null;
                            const isAdjusting =
                              adjustState?.messageIndex === i &&
                              adjustState?.field === first.field;
                            return (
                              <div className="flex flex-col items-end gap-1">
                                <p className="text-muted-foreground/80 max-w-[85%] text-[9px] leading-snug">
                                  {first.confirmMessage}
                                </p>
                                {isAdjusting ? (
                                  <div className="flex w-full max-w-[85%] flex-col items-end gap-1.5">
                                    <Input
                                      value={adjustState.value}
                                      onChange={(e) =>
                                        setAdjustState((prev) =>
                                          prev
                                            ? { ...prev, value: e.target.value }
                                            : null,
                                        )
                                      }
                                      className="h-8 text-xs"
                                      placeholder={first.text}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (
                                            !currentConvoId ||
                                            !adjustState ||
                                            adjustState.value.trim() === ""
                                          ) {
                                            setAdjustState(null);
                                            return;
                                          }
                                          await apiPatch(
                                            API_ROUTES.conversationPreferences(
                                              currentConvoId,
                                            ),
                                            {
                                              field: adjustState.field,
                                              value: adjustState.value.trim(),
                                            },
                                          );
                                          setMessagesByKey((prev) => {
                                            const list = prev[chatKey] || [];
                                            if (i >= list.length) return prev;
                                            const copy = [...list];
                                            const extractions =
                                              (
                                                copy[i] as {
                                                  extractions?: typeof msg.extractions;
                                                }
                                              ).extractions?.map((ex) =>
                                                ex.field === adjustState.field
                                                  ? {
                                                      ...ex,
                                                      needsConfirmation: false,
                                                      text: adjustState.value.trim(),
                                                    }
                                                  : {
                                                      ...ex,
                                                      needsConfirmation: false,
                                                    },
                                              ) ?? [];
                                            (
                                              copy[i] as {
                                                extractions?: typeof msg.extractions;
                                              }
                                            ).extractions = extractions;
                                            return { ...prev, [chatKey]: copy };
                                          });
                                          toast.success(
                                            `Preference updated: ${adjustState.field}`,
                                          );
                                          setAdjustState(null);
                                        }}
                                        className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90"
                                      >
                                        <Check className="h-3 w-3" /> Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAdjustState(null)}
                                        className="border-border bg-card text-muted-foreground hover:bg-muted flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        reportChatQualityEvent(
                                          "chat_extraction_confirmed_inline",
                                          {
                                            assistantId: selectedAssistant.id,
                                          },
                                        );
                                        if (!currentConvoId) return;
                                        for (const e of msg.extractions ?? []) {
                                          await apiPatch(
                                            API_ROUTES.conversationPreferences(
                                              currentConvoId,
                                            ),
                                            { field: e.field, value: e.text },
                                          );
                                        }
                                        setMessagesByKey((prev) => {
                                          const list = prev[chatKey] || [];
                                          if (i >= list.length) return prev;
                                          const copy = [...list];
                                          const extractions =
                                            (
                                              copy[i] as {
                                                extractions?: typeof msg.extractions;
                                              }
                                            ).extractions?.map((ex) => ({
                                              ...ex,
                                              needsConfirmation: false,
                                            })) ?? [];
                                          (
                                            copy[i] as {
                                              extractions?: typeof msg.extractions;
                                            }
                                          ).extractions = extractions;
                                          return { ...prev, [chatKey]: copy };
                                        });
                                        toast.success("Saved to your brief");
                                      }}
                                      className="border-border bg-background text-foreground hover:bg-muted/60 flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
                                    >
                                      <Check className="h-3 w-3" /> Looks good
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAdjustState({
                                          messageIndex: i,
                                          field: first.field,
                                          value: first.text,
                                        })
                                      }
                                      className="text-muted-foreground hover:bg-muted/50 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                                    >
                                      <Edit3 className="h-3 w-3" /> Adjust
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                      </div>
                    ) : null)}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
        {showReviewPrompt ? (
          <ReviewPrompt
            preferences={preferences}
            onDismiss={() => {
              reportChatQualityEvent("chat_review_prompt_dismissed", {
                assistantId: selectedAssistant.id,
              });
              setReviewShownAtByKey((prev) => ({
                ...prev,
                [chatKey]: [...(prev[chatKey] ?? []), messagesToShow.length],
              }));
            }}
            onReview={() => {
              reportChatQualityEvent("chat_review_prompt_opened_preferences", {
                assistantId: selectedAssistant.id,
              });
              document
                .querySelector('[aria-label="Preferences panel"]')
                ?.scrollIntoView({ behavior: "smooth" });
              setReviewShownAtByKey((prev) => ({
                ...prev,
                [chatKey]: [...(prev[chatKey] ?? []), messagesToShow.length],
              }));
            }}
          />
        ) : null}
        {preferenceProposalCount > 0 &&
        currentConvoId &&
        !isStreamingThisChat ? (
          <ConfirmationBanner
            proposals={proposalsByKey[chatKey]}
            onAutoDismiss={() => dismissProposals(chatKey)}
            onAccept={async (changeId) => {
              try {
                reportChatQualityEvent("chat_proposal_confirmed", {
                  changeId,
                  assistantId: selectedAssistant.id,
                });
                await apiPost(
                  API_ROUTES.conversationPreferencesConfirm(currentConvoId),
                  { changeId },
                );
                dismissProposals(chatKey, changeId);
                toast.success("Preference confirmed");
                if (currentConvoId) {
                  await refreshPreferences(currentConvoId);
                  await refreshConversationTitle?.(currentConvoId);
                }
              } catch {
                toast.error("Failed to confirm");
              }
            }}
            onReject={async (changeId) => {
              try {
                reportChatQualityEvent("chat_proposal_rejected", {
                  changeId,
                  assistantId: selectedAssistant.id,
                });
                await apiPost(
                  API_ROUTES.conversationPreferencesReject(currentConvoId),
                  { changeId },
                );
                dismissProposals(chatKey, changeId);
                toast.success("Preference rejected");
                if (currentConvoId) {
                  await refreshPreferences(currentConvoId);
                  await refreshConversationTitle?.(currentConvoId);
                }
              } catch {
                toast.error("Failed to reject");
              }
            }}
          />
        ) : null}
      </div>
      <div
        className={cn(
          "border-border flex min-w-0 shrink-0 flex-col gap-1.5 border-t pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          CHAT_MAIN_GUTTER_X_CLASS,
        )}
      >
        <p className="mt-2 flex items-center gap-2 text-xs font-medium">
          <Lightbulb className="text-primary h-3.5 w-3.5 shrink-0" />
          <span className="text-primary">Quick suggestions</span>
          <span className="text-foreground">for your project:</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((label) => (
            <button
              type="button"
              key={label}
              onClick={() => {
                if (isStreamingThisChat) return;
                reportChatQualityEvent("chat_suggestion_chip_sent", {
                  label,
                  assistantId: selectedAssistant.id,
                });
                sendMessage(chatKey, label, {
                  messageSource: "quick_suggestion",
                });
              }}
              className="border-border text-muted-foreground hover:bg-accent/15 hover:text-primary cursor-pointer rounded-full border bg-transparent px-2.5 py-1 text-xs font-medium transition-all duration-200"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="border-border bg-muted/30 focus-within:border-primary/50 focus-within:ring-primary/20 mt-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 transition-all duration-200 focus-within:ring-2">
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept="image/*"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded p-0.5 transition-colors"
            title="Attach image"
          >
            <Paperclip className="h-4 w-4 shrink-0" />
          </button>
          <Input
            ref={chatInputRef}
            placeholder="Ask about your design..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSendChatMessage()
            }
            className="text-muted-foreground placeholder:text-muted-foreground dark:text-muted-foreground min-h-[22px] min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-0.5 text-sm shadow-none focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
          />
          {isStreamingThisChat ? (
            <button
              type="button"
              onClick={() => stopStreaming(chatKey)}
              className="text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer rounded-md p-1.5 transition-colors"
              title="Stop generating"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSendChatMessage}
            disabled={!inputValue.trim() || isStreamingThisChat}
            className="bg-primary text-primary-foreground shrink-0 cursor-pointer rounded-md p-1.5 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
