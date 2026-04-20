"use client";

import React, { useCallback, lazy, Suspense } from "react";
import {
  Star,
  FolderOpen,
  MessageSquarePlus,
  Clock,
  LayoutDashboard,
  Sparkles,
  GitBranch,
  Home,
  Download,
  List,
  ListChecks,
  Bell,
} from "lucide-react";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useEvaAssistant } from "@/lib/eva-dashboard/contexts/eva-assistant-context";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useChatContext } from "@/lib/eva-dashboard/contexts/chat-context";
import { conversationTabId } from "@/lib/eva-dashboard/conversation-tab";
import { useActiveProject } from "@/lib/eva-dashboard/contexts/active-project-context";
import { cn } from "@/lib/utils";
import { API_ROUTES } from "@/lib/eva-dashboard/api";
import { PHASE_7_UI_COPY } from "@/lib/eva/projects/summary-constants";
import { toast } from "sonner";
import { Skeleton } from "@/components/eva-dashboard/ui/skeleton";
import { ChatView } from "@/components/eva-dashboard/views/chat-view";
import { ProjectWorkspaceHub } from "@/components/eva-dashboard/views/project-workspace-hub";
import { ComingSoonView } from "@/components/eva-dashboard/views/coming-soon-view";
import { ConversationHeaderActions } from "@/components/eva-dashboard/layout/conversation-header-actions";
import { ConversationProjectAssign } from "@/components/eva-dashboard/layout/conversation-project-assign";
import { ProjectChatPicker } from "@/components/eva-dashboard/project/project-chat-picker";
import { useProjectSurfaceConversationId } from "@/lib/eva-dashboard/hooks/use-project-surface-conversation-id";

const FilesView = lazy(() =>
  import("@/components/eva-dashboard/views/files-view").then((m) => ({
    default: m.FilesView,
  })),
);
const DiscoverView = lazy(() =>
  import("@/components/eva-dashboard/views/discover-view").then((m) => ({
    default: m.DiscoverView,
  })),
);
const RecommendationsView = lazy(() =>
  import("@/components/eva-dashboard/views/recommendations-view").then((m) => ({
    default: m.RecommendationsView,
  })),
);
const AssistantPickerView = lazy(() =>
  import("@/components/eva-dashboard/views/assistant-picker").then((m) => ({
    default: m.AssistantPickerView,
  })),
);
const PlaybookView = lazy(() =>
  import("@/components/eva-dashboard/views/playbook-view").then((m) => ({
    default: m.PlaybookView,
  })),
);
const HistoryView = lazy(() =>
  import("@/components/eva-dashboard/views/history-view").then((m) => ({
    default: m.HistoryView,
  })),
);
const ActivityInboxView = lazy(() =>
  import("@/components/eva-dashboard/views/activity-inbox-view").then((m) => ({
    default: m.ActivityInboxView,
  })),
);

function ViewSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/** Export uses the same project-scoped conversation resolution as Discover / Recommendations. */
function ExportProjectPanel() {
  const { activeProject } = useActiveProject();
  const scopeConversationId = useProjectSurfaceConversationId();
  const { recents } = useAppContext();

  const exportLabel = scopeConversationId
    ? (recents.find((r) => r.id === conversationTabId(scopeConversationId))
        ?.label ?? "Conversation")
    : null;

  return (
    <div className="p-6">
      <h1 className="text-foreground mb-2 text-base font-semibold">Export</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        Exports are generated from one conversation at a time. The default is a
        chat in your active project (or an unassigned chat when no project is
        selected), matching Discover and Recommendations.
        {activeProject
          ? ` Active project: ${activeProject.title}.`
          : " Select an active project in the sidebar to align exports with a design effort."}
      </p>
      {scopeConversationId ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Exporting{" "}
            <span className="text-foreground font-medium">
              {exportLabel ?? "conversation"}
            </span>
            . Full export includes messages; brief-only uses preferences and
            summary.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                fetch(
                  API_ROUTES.conversationExport(
                    scopeConversationId,
                    "markdown",
                    true,
                  ),
                )
                  .then((r) => r.blob())
                  .then((blob) => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `conversation-${scopeConversationId.slice(-8)}.md`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  })
                  .catch(() => toast.error("Export failed"));
              }}
              className="border-border bg-card hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Markdown (full)
            </button>
            <button
              type="button"
              onClick={() => {
                fetch(
                  API_ROUTES.conversationExport(
                    scopeConversationId,
                    "markdown",
                    false,
                  ),
                )
                  .then((r) => r.blob())
                  .then((blob) => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `design-brief-${scopeConversationId.slice(-8)}.md`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  })
                  .catch(() => toast.error("Export failed"));
              }}
              className="border-border bg-card hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Markdown (brief only)
            </button>
            <button
              type="button"
              onClick={() => {
                fetch(
                  API_ROUTES.conversationExport(
                    scopeConversationId,
                    "json",
                    true,
                  ),
                )
                  .then((r) => r.json())
                  .then((data) => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(
                      new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    a.download = `conversation-${scopeConversationId.slice(-8)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  })
                  .catch(() => toast.error("Export failed"));
              }}
              className="border-border bg-card hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
            >
              JSON (full)
            </button>
            <button
              type="button"
              onClick={() => {
                fetch(
                  API_ROUTES.conversationExport(
                    scopeConversationId,
                    "json",
                    false,
                  ),
                )
                  .then((r) => r.json())
                  .then((data) => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(
                      new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    a.download = `design-brief-${scopeConversationId.slice(-8)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  })
                  .catch(() => toast.error("Export failed"));
              }}
              className="border-border bg-card hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
            >
              JSON (brief only)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            There is no conversation available under the current project shell.
            Start a chat with this project active, or pick an existing thread.
          </p>
          <ProjectChatPicker className="border-border max-w-md rounded-lg border p-4 text-left" />
        </div>
      )}
    </div>
  );
}

interface MainContentProps {
  onEditInChatFromFiles?: (payload: {
    artifactId: string;
    title: string;
    conversationId: string;
  }) => void;
}

export function MainContent({ onEditInChatFromFiles }: MainContentProps) {
  const { activeItem, recents = [], onItemClick } = useAppContext();
  const { conversationId } = useCurrentConversation();
  const { setPendingMessage } = useChatContext();
  const { showAssistantPicker } = useEvaAssistant();
  const { activeProject } = useActiveProject();

  const sendSnippetToChat = useCallback(
    (text: string) => {
      setPendingMessage(text);
      if (conversationId) {
        const rid = conversationTabId(conversationId);
        const label = recents.find((r) => r.id === rid)?.label ?? "Chat";
        onItemClick(rid, label);
      } else {
        onItemClick("new-chat", "New Chat");
      }
    },
    [conversationId, onItemClick, recents, setPendingMessage],
  );

  const isChatView =
    activeItem === "new-chat" ||
    activeItem.startsWith("recent-") ||
    activeItem.startsWith("convo-");

  const getActiveIcon = () => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      "new-chat": MessageSquarePlus,
      files: FolderOpen,
      discover: Sparkles,
      playbook: GitBranch,
      workspace: LayoutDashboard,
      activity: Bell,
      project: Home,
      settings: Star,
      recommendations: ListChecks,
      export: Download,
      history: List,
    };
    const IconComponent =
      activeItem.startsWith("recent-") || activeItem.startsWith("convo-")
        ? Clock
        : iconMap[activeItem] || MessageSquarePlus;
    return <IconComponent className="text-muted-foreground h-3.5 w-3.5" />;
  };

  const getBreadcrumbText = () => {
    const projectPrefix = activeProject ? `${activeProject.title} · ` : "";
    if (activeItem.startsWith("recent-") || activeItem.startsWith("convo-")) {
      const found = recents.find((r) => r.id === activeItem);
      if (found) return `${projectPrefix}${found.label}`;
      return `${projectPrefix}Chat`;
    }
    if (activeItem === "new-chat") {
      return activeProject ? `${activeProject.title} · New chat` : "+ New Chat";
    }
    if (activeItem === "workspace")
      return activeProject ? `${activeProject.title} · Project` : "Project";
    if (activeItem === "playbook")
      return activeProject ? `${activeProject.title} · Playbook` : "Playbook";
    if (activeItem === "files")
      return activeProject ? `${activeProject.title} · Files` : "Files";
    if (activeItem === "discover")
      return activeProject ? `${activeProject.title} · Discover` : "Discover";
    if (activeItem === "recommendations")
      return activeProject
        ? `${activeProject.title} · Recommendations`
        : "Recommendations";
    if (activeItem === "export")
      return activeProject ? `${activeProject.title} · Export` : "Export";
    if (activeItem === "history")
      return activeProject ? `${activeProject.title} · History` : "History";
    if (activeItem === "activity")
      return activeProject
        ? `${activeProject.title} · ${PHASE_7_UI_COPY.workspaceActivityPageTitle}`
        : PHASE_7_UI_COPY.workspaceActivityPageTitle;
    return activeItem
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const renderContent = () => {
    if (isChatView) {
      return <ChatView />;
    }

    if (activeItem === "workspace") {
      return <ProjectWorkspaceHub />;
    }

    if (activeItem === "files") {
      return (
        <Suspense fallback={<ViewSkeleton />}>
          <FilesView onEditInChat={onEditInChatFromFiles} />
        </Suspense>
      );
    }
    if (activeItem === "discover") {
      return (
        <Suspense fallback={<ViewSkeleton />}>
          <DiscoverView onSendToChat={sendSnippetToChat} />
        </Suspense>
      );
    }
    if (activeItem === "recommendations") {
      return (
        <Suspense fallback={<ViewSkeleton />}>
          <RecommendationsView onSendToChat={sendSnippetToChat} />
        </Suspense>
      );
    }
    if (activeItem === "playbook") {
      return (
        <Suspense fallback={<ViewSkeleton />}>
          <div className="-m-6 flex h-full min-h-0 flex-col">
            <PlaybookView />
          </div>
        </Suspense>
      );
    }
    if (activeItem === "export") {
      return <ExportProjectPanel />;
    }
    if (activeItem === "history") {
      return (
        <Suspense fallback={<ViewSkeleton />}>
          <HistoryView onItemClick={onItemClick} />
        </Suspense>
      );
    }
    if (activeItem === "activity") {
      return (
        <Suspense fallback={<ViewSkeleton />}>
          <ActivityInboxView />
        </Suspense>
      );
    }

    switch (activeItem) {
      case "project":
        return <ProjectWorkspaceHub />;
      case "settings":
        return <ComingSoonView featureName="Settings" />;
      default:
        return (
          <div>
            <h1 className="text-foreground text-base font-semibold">
              Saved Plans
            </h1>
            <p className="text-muted-foreground text-xs">
              Select a section to get started
            </p>
          </div>
        );
    }
  };

  return (
    <div
      data-tutorial="main-content"
      className="flex h-full flex-col overflow-hidden"
    >
      {showAssistantPicker ? (
        <Suspense fallback={<ViewSkeleton />}>
          <AssistantPickerView />
        </Suspense>
      ) : (
        <>
          <div className="border-border flex h-9 min-h-9 shrink-0 items-center justify-between gap-2 border-b px-2 sm:h-10 sm:min-h-10 sm:px-3">
            <div className="flex min-w-0 items-center gap-2">
              {getActiveIcon()}
              <span className="text-muted-foreground shrink-0 text-xs">/</span>
              <span className="text-foreground border-primary max-w-[min(100%,28rem)] truncate border-b-2 pb-0.5 text-xs font-medium capitalize">
                {getBreadcrumbText()}
              </span>
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <ConversationProjectAssign />
              <ConversationHeaderActions />
            </div>
          </div>

          <main
            role="main"
            className={cn(
              "bg-card animate-in fade-in slide-in-from-bottom-2 flex min-h-0 flex-1 duration-200",
              isChatView
                ? "flex-col overflow-hidden p-0"
                : "overflow-y-auto p-4 sm:p-6",
            )}
          >
            {renderContent()}
          </main>
        </>
      )}
    </div>
  );
}
