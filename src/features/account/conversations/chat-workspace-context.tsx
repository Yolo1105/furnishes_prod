"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";

export type ChatSecKey = "project" | "files" | "discover" | "plan";

type ChatWorkspaceContextValue = {
  chatSec: ChatSecKey | null;
  openSection: (key: ChatSecKey) => void;
  exitSection: () => void;
};

/**
 * Turbopack HMR can load this module twice; a process-global Context keeps
 * Provider and useChatWorkspace on the same object across duplicates.
 */
const globalForChat = globalThis as typeof globalThis & {
  __furnishesChatWorkspaceCtx?: Context<ChatWorkspaceContextValue | null>;
};

const ChatWorkspaceContext =
  globalForChat.__furnishesChatWorkspaceCtx ??
  createContext<ChatWorkspaceContextValue | null>(null);

globalForChat.__furnishesChatWorkspaceCtx = ChatWorkspaceContext;

export function ChatWorkspaceProvider({ children }: { children: ReactNode }) {
  const [chatSec, setChatSec] = useState<ChatSecKey | null>(null);
  const openSection = useCallback((key: ChatSecKey) => setChatSec(key), []);
  const exitSection = useCallback(() => setChatSec(null), []);
  const value = useMemo(
    () => ({ chatSec, openSection, exitSection }),
    [chatSec, openSection, exitSection],
  );

  return (
    <ChatWorkspaceContext.Provider value={value}>
      {children}
    </ChatWorkspaceContext.Provider>
  );
}

export function useChatWorkspace(): ChatWorkspaceContextValue {
  const value = useContext(ChatWorkspaceContext);
  if (!value) {
    throw new Error(
      "useChatWorkspace must be used within ChatWorkspaceProvider",
    );
  }
  return value;
}
