"use client";

import React, { createContext, useContext } from "react";
import type { RecentItem } from "@/lib/eva-dashboard/types";

interface AppContextValue {
  activeItem: string;
  setActiveItem: (id: string) => void;
  recents: RecentItem[];
  removeRecent: (id: string) => void;
  /** Merge fields for a recent tab (e.g. after save/share). */
  patchRecent: (
    recentId: string,
    patch: Partial<
      Pick<RecentItem, "label" | "isSaved" | "savedAt" | "projectId">
    >,
  ) => void;
  onItemClick: (
    id: string,
    label: string,
    meta?: Partial<Pick<RecentItem, "isSaved" | "savedAt" | "projectId">>,
  ) => void;
  onConversationTitleGenerated?: (
    oldRecentId: string,
    convoId: string,
    title: string,
  ) => void;
  /** Refresh the tab label for a conversation (e.g. after brainstorm or preferences). */
  refreshConversationTitle?: (convoId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: AppContextValue;
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
