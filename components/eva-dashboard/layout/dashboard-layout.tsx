"use client";

import {
  AppProvider,
  useAppContext,
} from "@/lib/eva-dashboard/contexts/app-context";
import {
  EvaAssistantProvider,
  useEvaAssistant,
} from "@/lib/eva-dashboard/contexts/eva-assistant-context";
import {
  ActiveProjectProvider,
  useActiveProject,
} from "@/lib/eva-dashboard/contexts/active-project-context";
import {
  CurrentConversationProvider,
  useCurrentConversation,
} from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { conversationTabId } from "@/lib/eva-dashboard/conversation-tab";
import {
  CurrentPreferencesProvider,
  useCurrentPreferences,
} from "@/lib/eva-dashboard/contexts/current-preferences-context";
import {
  ChatProvider,
  useChatContext,
} from "@/lib/eva-dashboard/contexts/chat-context";
import { cn } from "@/lib/utils";
import { isChatLikeActiveItem } from "@/lib/eva-dashboard/chat-active-item";
import ErrorBoundary from "@/components/eva-dashboard/error-boundary";
import type { RecentItem } from "@/lib/eva-dashboard/types";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MainContent } from "./main-content";
import { AccountNavbar } from "@/components/eva-dashboard/account/account-navbar";
import { TutorialGuide } from "@/components/eva-dashboard/tutorial-guide";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { apiGet, apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import {
  DEFAULT_ASSISTANT,
  VIEW_IDS,
} from "@/lib/eva-dashboard/core/constants";
import { resolveConversationTabAfterProjectChange } from "@/lib/eva-dashboard/resolve-project-workspace-conversation";
import {
  setStoredActiveConversationForProject,
  storageKeyForActiveProject,
} from "@/lib/eva-dashboard/project-active-conversation-storage";

/** Remember last opened persisted chat per project (or unassigned bucket). */
function ProjectActiveConversationPersistence({
  activeItem,
  recents,
}: {
  activeItem: string;
  recents: RecentItem[];
}) {
  useEffect(() => {
    if (!activeItem.startsWith("convo-")) return;
    const r = recents.find((x) => x.id === activeItem);
    setStoredActiveConversationForProject(
      storageKeyForActiveProject(r?.projectId),
      activeItem.replace(/^convo-/, ""),
    );
  }, [activeItem, recents]);

  return null;
}

/** Non-chat main views should not keep a stale global conversation id in context. */
function ClearConversationWhenNoChatTab({
  activeItem,
}: {
  activeItem: string;
}) {
  const { setConversationId } = useCurrentConversation();
  useEffect(() => {
    const chatLike =
      activeItem === VIEW_IDS.NEW_CHAT ||
      activeItem.startsWith("recent-") ||
      activeItem.startsWith("convo-");
    if (!chatLike) setConversationId(null);
  }, [activeItem, setConversationId]);
  return null;
}

/**
 * When the active project shell changes, resolve the workspace into that project:
 * stored active conversation → most recent in project → project hub (or new chat when
 * no project / no unassigned conversations).
 */
function ActiveProjectChatSync({
  setActiveItem,
  onItemClick,
}: {
  setActiveItem: (id: string) => void;
  onItemClick: (
    id: string,
    label: string,
    meta?: Partial<Pick<RecentItem, "isSaved" | "savedAt" | "projectId">>,
  ) => void;
}) {
  const { activeProjectId } = useActiveProject();
  const prevProjectRef = useRef<string | null | undefined>(undefined);
  const recentsRef = useRef<RecentItem[]>([]);
  const { recents } = useAppContext();

  useEffect(() => {
    recentsRef.current = recents;
  }, [recents]);

  useEffect(() => {
    if (prevProjectRef.current === undefined) {
      prevProjectRef.current = activeProjectId;
      return;
    }
    if (prevProjectRef.current === activeProjectId) return;
    prevProjectRef.current = activeProjectId;

    void (async () => {
      const result = await resolveConversationTabAfterProjectChange(
        activeProjectId,
        recentsRef.current,
      );
      if (result.kind === "convo") {
        onItemClick(result.tabId, result.title, result.meta);
        return;
      }
      if (activeProjectId) {
        setActiveItem(VIEW_IDS.WORKSPACE);
      } else {
        setActiveItem(VIEW_IDS.NEW_CHAT);
      }
    })();
  }, [activeProjectId, onItemClick, setActiveItem]);

  return null;
}
/** After switching active project, refresh preference state for the open chat to avoid stale brief UI. */
function ProjectContextSync() {
  const { activeProjectId } = useActiveProject();
  const { conversationId } = useCurrentConversation();
  const { refreshPreferences } = useCurrentPreferences();
  const prevProjectRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prevProjectRef.current === undefined) {
      prevProjectRef.current = activeProjectId;
      return;
    }
    if (prevProjectRef.current !== activeProjectId) {
      prevProjectRef.current = activeProjectId;
      if (conversationId) void refreshPreferences(conversationId);
    }
  }, [activeProjectId, conversationId, refreshPreferences]);

  return null;
}

/** Subtle ring on the main panel when a chat thread is active (readability, not sidebar dimming). */
function ChatShellPanel({
  activeItem,
  tone,
  className,
  children,
}: {
  activeItem: string;
  tone: "rail" | "main";
  className?: string;
  children: React.ReactNode;
}) {
  const { chatThreadPrimacy } = useChatContext();
  const chatLike = isChatLikeActiveItem(activeItem);
  const quiet = chatLike && chatThreadPrimacy;
  return (
    <div
      className={cn(
        className,
        quiet &&
          tone === "main" &&
          "ring-border/25 relative z-[1] shadow-sm ring-1",
        quiet &&
          tone === "rail" &&
          "opacity-[0.78] transition-opacity duration-200",
      )}
    >
      {children}
    </div>
  );
}

function DashboardLayoutInner() {
  const [activeItem, setActiveItem] = useState("new-chat");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(
    null,
  );
  const { setShowAssistantPicker, setSelectedAssistant } = useEvaAssistant();

  // Always start on New Chat when the app loads (e.g. after login)
  useEffect(() => {
    setActiveItem("new-chat");
  }, []);

  /** Literal `new-chat` tab (initial shell or after closing the active tab) uses default assistant. */
  useEffect(() => {
    if (activeItem !== "new-chat") return;
    setSelectedAssistant(DEFAULT_ASSISTANT);
  }, [activeItem, setSelectedAssistant]);

  useEffect(() => {
    apiGet<{
      conversations: {
        id: string;
        title: string;
        isSaved?: boolean;
        savedAt?: string | null;
        projectId?: string | null;
      }[];
    }>(API_ROUTES.conversations)
      .then((data) => {
        const convos = data.conversations ?? [];
        const apiRecents: RecentItem[] = convos.map((c) => ({
          id: `convo-${c.id}`,
          label: c.title,
          isSaved: c.isSaved ?? false,
          savedAt: c.savedAt ?? null,
          projectId: c.projectId ?? null,
        }));
        setRecents(apiRecents);
      })
      .catch(() => {
        /** DB down / 503 — avoid console.error (Next dev overlay). Recents stay empty. */
        setRecents([]);
      });
  }, []);

  const patchRecent = useCallback(
    (
      recentId: string,
      patch: Partial<
        Pick<RecentItem, "label" | "isSaved" | "savedAt" | "projectId">
      >,
    ) => {
      setRecents((prev) =>
        prev.map((r) => (r.id === recentId ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const handleItemClick = useCallback(
    (
      id: string,
      label: string,
      meta?: Partial<Pick<RecentItem, "isSaved" | "savedAt" | "projectId">>,
    ) => {
      const itemId = id;

      if (id === "new-chat") {
        setSelectedAssistant(DEFAULT_ASSISTANT);
        const newId = `recent-${Date.now()}`;
        setRecents((prev) => [
          { id: newId, label: "New Chat", isSaved: false },
          ...prev,
        ]);
        setActiveItem(newId);
        return;
      }

      setShowAssistantPicker(false);

      const isConversationTab =
        itemId.startsWith("recent-") || itemId.startsWith("convo-");
      if (isConversationTab) {
        setRecents((prev) => {
          const existing = prev.find((r) => r.id === itemId);
          if (existing) {
            return prev.map((r) =>
              r.id === itemId
                ? {
                    ...r,
                    label,
                    ...(meta
                      ? {
                          isSaved: meta.isSaved,
                          savedAt: meta.savedAt,
                          projectId: meta.projectId,
                        }
                      : {}),
                  }
                : r,
            );
          }
          return [
            {
              id: itemId,
              label,
              isSaved: meta?.isSaved ?? false,
              savedAt: meta?.savedAt ?? null,
              projectId: meta?.projectId,
            },
            ...prev,
          ];
        });
      }

      setActiveItem(itemId);
    },
    [setShowAssistantPicker, setSelectedAssistant],
  );

  const handleHelpClick = () => {
    setIsTutorialOpen(true);
  };

  const onConversationTitleGenerated = useCallback(
    (oldRecentId: string, convoId: string, title: string) => {
      const newId = `convo-${convoId}`;
      setRecents((prev) =>
        prev.map((r) =>
          r.id === oldRecentId
            ? {
                id: newId,
                label: title,
                isSaved: r.isSaved ?? false,
                savedAt: r.savedAt,
                projectId: r.projectId,
              }
            : r,
        ),
      );
      setActiveItem((current) => (current === oldRecentId ? newId : current));
    },
    [],
  );

  const removeRecent = useCallback((id: string) => {
    setRecents((prev) => prev.filter((r) => r.id !== id));
    setActiveItem((current) => (current === id ? "new-chat" : current));
  }, []);

  const onNewConversation = useCallback(
    (provisionalKey: string, newConvoId: string, projectId: string | null) => {
      const newId = `convo-${newConvoId}`;
      setRecents((prev) => {
        const withoutProvisional = prev.filter((r) => r.id !== provisionalKey);
        const idx = withoutProvisional.findIndex((r) => r.id === newId);
        if (idx >= 0) {
          const copy = [...withoutProvisional];
          copy[idx] = {
            ...copy[idx],
            label: "New Chat",
            isSaved: false,
            savedAt: null,
            projectId,
          };
          return copy;
        }
        return [
          {
            id: newId,
            label: "New Chat",
            isSaved: false,
            savedAt: null,
            projectId,
          },
          ...withoutProvisional,
        ];
      });
      setActiveItem(newId);
    },
    [],
  );

  const refreshConversationTitle = useCallback(async (convoId: string) => {
    try {
      const data = await apiPost<{ title: string }>(
        API_ROUTES.conversationTitle(convoId),
        {},
      );
      const convoRecentId = `convo-${convoId}`;
      setRecents((prev) =>
        prev.map((r) =>
          r.id === convoRecentId ? { ...r, label: data.title } : r,
        ),
      );
    } catch {
      // ignore; tab keeps current label
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "n" || e.key === "k") {
        e.preventDefault();
        handleItemClick("new-chat", "New Chat");
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("focus-chat-input"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleItemClick]);

  const appContextValue = useMemo(
    () => ({
      activeItem,
      setActiveItem,
      recents,
      removeRecent,
      patchRecent,
      onItemClick: handleItemClick,
      onConversationTitleGenerated,
      refreshConversationTitle,
    }),
    [
      activeItem,
      recents,
      removeRecent,
      patchRecent,
      handleItemClick,
      onConversationTitleGenerated,
      refreshConversationTitle,
    ],
  );

  return (
    <AppProvider value={appContextValue}>
      <CurrentConversationProvider>
        <CurrentPreferencesProvider>
          <ChatProvider
            pendingMessage={pendingChatMessage}
            setPendingMessage={setPendingChatMessage}
            onClearPendingMessage={() => setPendingChatMessage(null)}
            onConversationTitleGenerated={onConversationTitleGenerated}
            onNewConversation={onNewConversation}
          >
            <ActiveProjectChatSync
              setActiveItem={setActiveItem}
              onItemClick={handleItemClick}
            />
            <ProjectActiveConversationPersistence
              activeItem={activeItem}
              recents={recents}
            />
            <ClearConversationWhenNoChatTab activeItem={activeItem} />
            <ProjectContextSync />
            <ErrorBoundary>
              <div className="bg-muted flex h-screen w-full flex-col overflow-hidden">
                <AccountNavbar onMenuClick={() => setMobileNavOpen(true)} />

                <div className="flex flex-1 gap-2 overflow-hidden p-2 px-4">
                  {mobileNavOpen && (
                    <div
                      className="fixed inset-0 z-40 md:hidden"
                      aria-modal="true"
                      role="dialog"
                    >
                      <div
                        className="fixed inset-0 bg-black/30"
                        onClick={() => setMobileNavOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="bg-card border-border fixed top-0 left-0 z-50 flex h-full w-64 flex-col overflow-hidden border-r shadow-lg">
                        <LeftSidebar
                          isOverlay
                          onHelpClick={() => {
                            handleHelpClick();
                            setMobileNavOpen(false);
                          }}
                          onCloseMobileMenu={() => setMobileNavOpen(false)}
                        />
                      </div>
                    </div>
                  )}
                  <ChatShellPanel
                    activeItem={activeItem}
                    tone="rail"
                    className="hidden h-full overflow-hidden md:flex md:flex-col"
                  >
                    <LeftSidebar onHelpClick={handleHelpClick} />
                  </ChatShellPanel>

                  <ChatShellPanel
                    activeItem={activeItem}
                    tone="main"
                    className="bg-card border-border min-w-0 flex-1 overflow-hidden border transition-all duration-200"
                  >
                    <MainContent
                      onEditInChatFromFiles={({
                        title,
                        artifactId,
                        conversationId: cid,
                      }) => {
                        setPendingChatMessage(
                          `[artifact:${artifactId}] Can you help me refine the file "${title}"? Please keep context tied to this attachment (artifact id ${artifactId}).`,
                        );
                        const rid = conversationTabId(cid);
                        const label =
                          recents.find((r) => r.id === rid)?.label ?? "Chat";
                        handleItemClick(rid, label);
                      }}
                    />
                  </ChatShellPanel>

                  <ChatShellPanel
                    activeItem={activeItem}
                    tone="rail"
                    className="hidden h-full overflow-hidden lg:flex lg:flex-col"
                  >
                    <RightSidebar
                      onSendToChat={(text) => {
                        setPendingChatMessage(text);
                        const isChat =
                          activeItem === "new-chat" ||
                          activeItem.startsWith("recent-") ||
                          activeItem.startsWith("convo-");
                        if (!isChat) {
                          const newId = `recent-${Date.now()}`;
                          setRecents((prev) => [
                            { id: newId, label: "New Chat" },
                            ...prev,
                          ]);
                          setActiveItem(newId);
                        }
                      }}
                    />
                  </ChatShellPanel>
                </div>

                <TutorialGuide
                  isOpen={isTutorialOpen}
                  onClose={() => setIsTutorialOpen(false)}
                />
              </div>
            </ErrorBoundary>
          </ChatProvider>
        </CurrentPreferencesProvider>
      </CurrentConversationProvider>
    </AppProvider>
  );
}

export function DashboardLayout() {
  return (
    <EvaAssistantProvider>
      <ActiveProjectProvider>
        <DashboardLayoutInner />
      </ActiveProjectProvider>
    </EvaAssistantProvider>
  );
}
