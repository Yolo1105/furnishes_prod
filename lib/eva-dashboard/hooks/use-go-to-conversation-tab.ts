"use client";

import { useCallback } from "react";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { conversationTabId } from "@/lib/eva-dashboard/conversation-tab";

/**
 * Focus the chat tab for the current conversation context, or New Chat if none.
 */
export function useGoToConversationTab() {
  const { conversationId } = useCurrentConversation();
  const { onItemClick, recents } = useAppContext();

  return useCallback(() => {
    if (conversationId) {
      const rid = conversationTabId(conversationId);
      const label = recents.find((r) => r.id === rid)?.label ?? "Chat";
      onItemClick(rid, label);
      return;
    }
    onItemClick("new-chat", "New Chat");
  }, [conversationId, onItemClick, recents]);
}
