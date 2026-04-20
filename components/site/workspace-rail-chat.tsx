"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RotateCcw, Send } from "lucide-react";

import "@/app/(chromeless)/chatbot/eva-dashboard-theme.css";

import { EvaToaster } from "@/components/eva/eva-toaster";
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
import { parseHighlightedContent } from "@/lib/eva-dashboard/parse-highlights";
import { cn } from "@/lib/utils";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import { apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import { toast } from "sonner";
import { isAssistantBubbleFailureState } from "@/lib/eva/core/chat-copy";
import { getLatestUserText } from "@/lib/eva-dashboard/chat/last-user-message-text";
import { SITE_MARKETING_RAIL_CHAT_KEY } from "@/lib/eva-dashboard/chat/rail-chat-ids";

const QUICK_PROMPTS = [
  "Help me plan a cohesive living room layout.",
  "What pairs well with warm neutrals and natural wood?",
  "How should I measure doorways before ordering a sofa?",
];

type LightIntent =
  | "budget"
  | "color"
  | "measure"
  | "style"
  | "compare"
  | "care"
  | "deliver"
  | null;

function inferLightIntent(lower: string): LightIntent {
  if (
    lower.includes("budget") ||
    lower.includes("afford") ||
    lower.includes("under $") ||
    lower.includes("price")
  )
    return "budget";
  if (
    lower.includes("color") ||
    lower.includes("paint") ||
    lower.includes("wall") ||
    lower.includes("palette")
  )
    return "color";
  if (
    lower.includes("measure") ||
    lower.includes("doorway") ||
    lower.includes("fit") ||
    lower.includes("size")
  )
    return "measure";
  if (
    lower.includes("style") ||
    lower.includes("aesthetic") ||
    lower.includes("japandi") ||
    lower.includes("modern") ||
    lower.includes("minimal")
  )
    return "style";
  if (
    lower.includes("compare") ||
    lower.includes(" vs ") ||
    lower.includes("which") ||
    lower.includes("better")
  )
    return "compare";
  if (
    lower.includes("care") ||
    lower.includes("clean") ||
    lower.includes("maintain") ||
    lower.includes("fabric")
  )
    return "care";
  if (
    lower.includes("deliver") ||
    lower.includes("ship") ||
    lower.includes("lead time")
  )
    return "deliver";
  return null;
}

/** Context-aware follow-ups (route + last user turn). Max 4 short lines for the narrow rail. */
function getRailSuggestionChips(
  pathname: string | null,
  lastUserText: string,
): string[] {
  const p = pathname ?? "";
  const l = lastUserText.toLowerCase();
  const intent = inferLightIntent(l);

  const intentChips: Record<Exclude<LightIntent, null>, string[]> = {
    budget: [
      "Best value around a mid-range budget?",
      "What’s worth splurging vs. saving on?",
      "Payment or financing options to ask about?",
    ],
    color: [
      "Accent ideas for warm neutrals?",
      "Wall colors that work with natural wood?",
      "Tie a whole room together cohesively?",
    ],
    measure: [
      "Clearance and walkway rules of thumb?",
      "What to measure before ordering a sofa?",
      "Small-space layout mistakes to avoid?",
    ],
    style: [
      "Japandi vs. warm minimal — key differences?",
      "Layer lighting for a cozy living room?",
      "Mix wood tones without clashing?",
    ],
    compare: [
      "How do I shortlist two similar pieces?",
      "What specs matter most for longevity?",
      "Questions to ask before I decide?",
    ],
    care: [
      "Daily care for performance fabrics?",
      "Protecting wood from sun and spills?",
      "When to call a pro for upholstery?",
    ],
    deliver: [
      "What to expect for white-glove delivery?",
      "How to prep a room before arrival?",
      "Inspecting furniture on delivery day?",
    ],
  };

  if (intent && intentChips[intent]) {
    return intentChips[intent].slice(0, 4);
  }

  if (
    p.startsWith("/collections/") &&
    p !== "/collections" &&
    p.length > "/collections/".length
  ) {
    return [
      "What should I know about this piece?",
      "What pairs well with it in a room?",
      "Care and maintenance tips?",
      "Sizing and clearance for delivery?",
    ];
  }

  if (p === "/collections" || p.startsWith("/collections?")) {
    return [
      "How do I choose between similar pieces?",
      "What’s working well in small apartments?",
      "Trends vs. timeless — how do I balance?",
    ];
  }

  if (p.startsWith("/inspiration")) {
    return [
      "Turn this mood into a shopping list?",
      "Translate this look to my budget?",
      "What details make this style convincing?",
    ];
  }

  if (p.startsWith("/quiz")) {
    return [
      "Explain my style result in practical terms?",
      "What should I buy first for this look?",
      "Common mistakes for this aesthetic?",
    ];
  }

  return [
    "Help me plan a cohesive living room layout.",
    "What pairs well with warm neutrals and natural wood?",
    "Quick checklist before I order furniture.",
    "How do I brief a contractor or mover?",
  ];
}

function WorkspaceRailChatPanelInner() {
  const pathname = usePathname();
  const {
    messagesByKey,
    setMessagesByKey,
    sendMessage,
    isStreamingForKey,
    inputValue,
    setInputValue,
    conversationIds,
    proposalsByKey,
    dismissProposals,
  } = useChatContext();
  const { setConversationId } = useCurrentConversation();
  const { refreshPreferences } = useCurrentPreferences();

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const key = SITE_MARKETING_RAIL_CHAT_KEY;

  const messages = messagesByKey[key] ?? [];
  const streaming = isStreamingForKey(key);
  const lastUserText = getLatestUserText(messages);
  const suggestionChips = useMemo(
    () => getRailSuggestionChips(pathname, lastUserText),
    [pathname, lastUserText],
  );
  const lastMsg = messages[messages.length - 1];
  const showFollowUpChips =
    messages.length > 0 &&
    !streaming &&
    lastMsg?.role === "assistant" &&
    (Boolean(lastMsg.content?.trim()) || Boolean(lastMsg.isError));
  const currentConvoId =
    conversationIds[key] ??
    (key.startsWith("convo-") ? key.replace("convo-", "") : null);
  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    setConversationId(currentConvoId);
  }, [currentConvoId, setConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastMessageContent]);

  useEffect(() => {
    const onFocus = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", onFocus);
    return () => window.removeEventListener("focus-chat-input", onFocus);
  }, []);

  const handleRetry = () => {
    const list = messagesByKey[key] ?? [];
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
      [key]: list.slice(0, -2),
    }));
    sendMessage(key, userContent, {
      ...(prev.chatAttachments?.length
        ? { attachments: prev.chatAttachments }
        : {}),
    });
  };

  const handleSend = () => {
    const t = inputValue.trim();
    if (!t || streaming) return;
    sendMessage(key, t);
    setInputValue("");
  };

  return (
    <div className="eva-dashboard-root text-foreground flex min-h-0 flex-1 flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <ChatAvatar role="assistant" initial="E" size="md" />
            <p className="text-foreground mt-3 text-sm font-semibold">
              Ask Eva about your space
            </p>
            <p className="text-muted-foreground mt-1 max-w-[260px] text-xs leading-relaxed">
              Same assistant as the full workspace — quick answers while you
              browse.
            </p>
            <div className="mt-4 flex w-full flex-col gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (streaming) return;
                    sendMessage(key, prompt, {
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
                      msg.content
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
                    sendMessage(key, label, {
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
        {proposalsByKey[key]?.length > 0 && currentConvoId && (
          <ConfirmationBanner
            proposals={proposalsByKey[key]}
            onAutoDismiss={() => dismissProposals(key)}
            onAccept={async (changeId) => {
              try {
                await apiPost(
                  API_ROUTES.conversationPreferencesConfirm(currentConvoId),
                  { changeId },
                );
                dismissProposals(key, changeId);
                toast.success("Preference confirmed");
                await refreshPreferences(currentConvoId);
              } catch {
                toast.error("Failed to confirm");
              }
            }}
            onReject={async (changeId) => {
              try {
                await apiPost(
                  API_ROUTES.conversationPreferencesReject(currentConvoId),
                  { changeId },
                );
                dismissProposals(key, changeId);
                toast.success("Preference rejected");
                await refreshPreferences(currentConvoId);
              } catch {
                toast.error("Failed to reject");
              }
            }}
          />
        )}
      </div>

      <div className="border-border shrink-0 border-t bg-white px-3 py-2">
        <div className="border-border bg-muted/30 focus-within:border-primary/50 focus-within:ring-primary/20 flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-all focus-within:ring-2">
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
            disabled={!inputValue.trim() || streaming}
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

/**
 * Providers + toaster for the marketing workspace rail — mirrors /chatbot stack
 * (preferences + streaming /api/chat) without AppProvider / workspace tabs.
 */
export function WorkspaceRailChatProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <EvaAssistantProvider>
      <CurrentConversationProvider>
        <CurrentPreferencesProvider>
          <ChatProvider>
            <EvaToaster />
            {children}
          </ChatProvider>
        </CurrentPreferencesProvider>
      </CurrentConversationProvider>
    </EvaAssistantProvider>
  );
}

export function WorkspaceRailChatPanel() {
  return (
    <WorkspaceRailChatProviders>
      <WorkspaceRailChatPanelInner />
    </WorkspaceRailChatProviders>
  );
}
