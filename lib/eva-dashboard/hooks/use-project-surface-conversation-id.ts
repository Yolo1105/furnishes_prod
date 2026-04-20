"use client";

import { useEffect, useState } from "react";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { resolveSurfaceConversationId } from "@/lib/eva-dashboard/resolve-project-workspace-conversation";

/**
 * Conversation id for Discover / Recommendations / Export: same rules as project switch —
 * open chat when it matches the active project shell, else stored id for that shell when
 * still valid, else most recent conversation in the project (API `updatedAt desc`).
 */
export function useProjectSurfaceConversationId(): string | null {
  const ap = useActiveProjectOptional();
  const activeProjectId = ap?.activeProjectId ?? null;
  const { conversationId } = useCurrentConversation();
  const { recents } = useAppContext();
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveSurfaceConversationId(
      activeProjectId,
      conversationId,
      recents,
    ).then((id) => {
      if (!cancelled) setResolved(id);
    });
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, conversationId, recents]);

  return resolved;
}
