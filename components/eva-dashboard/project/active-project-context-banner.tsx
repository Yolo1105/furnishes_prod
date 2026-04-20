"use client";

import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { conversationTabId } from "@/lib/eva-dashboard/conversation-tab";

/**
 * Transitional warning when project assignment does not match the active project shell.
 * Normal steady state should not rely on this — project switching re-resolves the open tab.
 * Pass `conversationIdForProjectCheck` on Discover/Recommendations when using a scoped id.
 */
export function ActiveProjectContextBanner({
  conversationIdForProjectCheck,
}: {
  conversationIdForProjectCheck?: string | null;
} = {}) {
  const { conversationId } = useCurrentConversation();
  const { recents } = useAppContext();
  const ap = useActiveProjectOptional();

  const effectiveId = conversationIdForProjectCheck ?? conversationId;

  if (!ap?.activeProjectId || !effectiveId) return null;

  const rid = conversationTabId(effectiveId);
  const row = recents.find((r) => r.id === rid);
  if (!row) return null;

  const convProjectId = row.projectId ?? undefined;

  if (convProjectId === ap.activeProjectId) return null;

  return (
    <div
      className="border-review-border bg-review/35 mb-4 rounded-lg border px-3 py-2 text-xs leading-relaxed"
      role="status"
    >
      <span className="text-review-foreground font-medium">
        Project mismatch:{" "}
      </span>
      <span className="text-review-muted">
        This chat is{" "}
        {convProjectId
          ? "linked to a different project"
          : "not assigned to a project"}
        . Use &quot;Assign to project&quot; in the header to align it with{" "}
        <span className="text-foreground font-medium">
          {ap.projects.find((p) => p.id === ap.activeProjectId)?.title ??
            "the active project"}
        </span>
        , or switch the active project in the sidebar.
      </span>
    </div>
  );
}
