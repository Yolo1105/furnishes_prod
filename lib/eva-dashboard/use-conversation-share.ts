"use client";

import { useState, useCallback } from "react";
import { copyShareLinkForConversation } from "@/lib/eva-dashboard/conversation-actions";

/**
 * Shared loading guard for header + sidebar share actions (same UX, no duplicated try/finally).
 */
export function useConversationShare(conversationId: string | null) {
  const [pending, setPending] = useState(false);
  const runShare = useCallback(async () => {
    if (!conversationId) return;
    setPending(true);
    try {
      await copyShareLinkForConversation(conversationId);
    } finally {
      setPending(false);
    }
  }, [conversationId]);
  return { pending, runShare };
}
