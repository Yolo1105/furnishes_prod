"use client";

import type React from "react";
import {
  FolderOpen,
  MessageSquarePlus,
  CircleHelp,
  Sparkles,
  GitBranch,
  LayoutDashboard,
  Trash2,
  ListChecks,
  Download,
  List,
  Star,
  Bell,
} from "lucide-react";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useChatContext } from "@/lib/eva-dashboard/contexts/chat-context";
import { toast } from "sonner";
import { apiDelete, API_ROUTES } from "@/lib/eva-dashboard/api";
import { IconButton } from "@/components/eva-dashboard/shared/icon-button";
import { SectionLabel } from "@/components/eva-dashboard/shared/section-label";
import { ActiveProjectSwitcher } from "@/components/eva-dashboard/layout/active-project-switcher";
import { cn } from "@/lib/utils";
import { PHASE_7_UI_COPY } from "@/lib/eva/projects/summary-constants";
import { useState, useEffect, memo } from "react";
import { TypingText } from "@/components/eva-dashboard/shared/typing-text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/eva-dashboard/ui/alert-dialog";

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  id: string;
  expandable: boolean;
  subItems?: { label: string; id: string }[];
  /** When true, entry is non-interactive and shows a Soon badge (feature not wired yet). */
  comingSoon?: boolean;
};

const navigationCategories: { id: string; label: string; items: NavItem[] }[] =
  [
    {
      id: "discover",
      label: "DISCOVER",
      items: [
        {
          icon: MessageSquarePlus,
          label: "New Chat",
          id: "new-chat",
          expandable: false,
        },
        {
          icon: LayoutDashboard,
          label: "Project",
          id: "workspace",
          expandable: false,
        },
        {
          icon: Bell,
          label: PHASE_7_UI_COPY.workspaceActivityNavLabel,
          id: "activity",
          expandable: false,
        },
        { icon: FolderOpen, label: "Files", id: "files", expandable: false },
      ],
    },
    {
      id: "design",
      label: "DESIGN",
      items: [
        {
          icon: Sparkles,
          label: "Discover",
          id: "discover",
          expandable: false,
        },
        {
          icon: ListChecks,
          label: "Recommendations",
          id: "recommendations",
          expandable: false,
        },
        {
          icon: GitBranch,
          label: "Playbook",
          id: "playbook",
          expandable: false,
        },
        { icon: Download, label: "Export", id: "export", expandable: false },
        { icon: List, label: "History", id: "history", expandable: false },
      ],
    },
  ];

interface LeftSidebarProps {
  onHelpClick?: () => void;
  /** When true, sidebar is shown as overlay (no hidden on mobile). */
  isOverlay?: boolean;
  /** Callback when user selects a nav item (e.g. close mobile overlay). */
  onCloseMobileMenu?: () => void;
}

const WELCOME_TEXT = "Welcome back !";

export const LeftSidebar = memo(function LeftSidebar({
  onHelpClick,
  isOverlay,
  onCloseMobileMenu,
}: LeftSidebarProps) {
  const {
    activeItem,
    recents = [],
    onItemClick,
    removeRecent,
  } = useAppContext();
  const { removeConversationData } = useChatContext();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const handleItemClick = (id: string, label: string) => {
    onItemClick(id, label);
    onCloseMobileMenu?.();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const convoId = deleteTarget.id.startsWith("convo-")
      ? deleteTarget.id.replace(/^convo-/, "")
      : null;
    if (convoId) {
      apiDelete(API_ROUTES.conversation(convoId))
        .then(() => {
          removeConversationData(deleteTarget.id);
          removeRecent(deleteTarget.id);
        })
        .catch(() => toast.error("Could not delete conversation"));
    } else {
      removeConversationData(deleteTarget.id);
      removeRecent(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <aside
        className={cn(
          "border-border bg-card h-full w-64 shrink-0 flex-col border",
          isOverlay ? "flex" : "hidden md:flex",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div
            data-tutorial="welcome"
            className="border-border flex h-[60px] shrink-0 items-center border-b px-5 pt-3 pb-2"
          >
            <div className="flex w-full items-center">
              <div className="text-foreground min-w-0 flex-1 text-[13px] leading-[1.3] font-medium">
                <TypingText text={WELCOME_TEXT} speed={90} />
              </div>
              <IconButton
                icon={CircleHelp}
                title="Help & Tutorial"
                onClick={onHelpClick}
              />
            </div>
          </div>

          <div className="border-border shrink-0 border-b px-3 py-2">
            <ActiveProjectSwitcher />
          </div>

          <nav
            data-tutorial="navigation"
            className="scrollbar-hide flex flex-1 flex-col gap-0 overflow-y-auto"
          >
            <div className="space-y-1.5 pt-3">
              {navigationCategories.map((category) => (
                <div key={category.id}>
                  <div className="px-5 pb-0.5">
                    <SectionLabel>{category.label}</SectionLabel>
                  </div>
                  <div className="space-y-0">
                    {category.items.map((item) => (
                      <div key={item.id}>
                        {item.comingSoon ? (
                          <div
                            role="button"
                            aria-disabled="true"
                            tabIndex={-1}
                            className={cn(
                              "group flex w-full cursor-not-allowed items-center gap-2 rounded-none px-5 py-1 text-left text-xs font-medium opacity-40",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            <span className="ml-2 text-[10px] tracking-wider uppercase opacity-60">
                              Soon
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleItemClick(item.id, item.label)}
                            className={cn(
                              "group flex w-full cursor-pointer items-center gap-2 rounded-none px-5 py-1 text-left text-xs font-medium",
                              "transition-all duration-200",
                              item.id === "new-chat"
                                ? "text-foreground/80 hover:bg-accent/15 hover:text-foreground"
                                : activeItem === item.id ||
                                    activeItem.startsWith(`${item.id}-`)
                                  ? "bg-accent/15 text-primary"
                                  : "text-foreground/80 hover:bg-accent/15 hover:text-foreground",
                            )}
                            aria-current={
                              item.id !== "new-chat" &&
                              (activeItem === item.id ||
                                activeItem.startsWith(`${item.id}-`))
                                ? "page"
                                : undefined
                            }
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Recents */}
              <div>
                <div className="px-5 pb-0.5">
                  <SectionLabel>RECENTS</SectionLabel>
                </div>
                <div className="space-y-0">
                  {recents.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-1 rounded-none px-5 py-1.5 text-left text-xs font-medium",
                        "transition-all duration-200",
                        activeItem === item.id
                          ? "bg-accent/15 text-primary"
                          : "text-foreground/80 hover:bg-accent/15 hover:text-foreground",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleItemClick(item.id, item.label)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
                        aria-current={
                          activeItem === item.id ? "page" : undefined
                        }
                      >
                        {item.isSaved && (
                          <Star
                            className="fill-primary text-primary h-3 w-3 shrink-0"
                            aria-hidden
                          />
                        )}
                        <span className="truncate">{item.label}</span>
                        {item.id.startsWith("convo-") &&
                          item.projectId == null && (
                            <span
                              className="border-review-border/50 text-review-foreground shrink-0 rounded border bg-transparent px-1 py-0 text-[8px] font-semibold tracking-wide uppercase"
                              title="Not assigned to a design project"
                            >
                              Unassigned
                            </span>
                          )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: item.id, label: item.label });
                        }}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </aside>
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.label}&quot;?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
