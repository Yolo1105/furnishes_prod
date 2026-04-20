"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useActiveProject } from "@/lib/eva-dashboard/contexts/active-project-context";
import { apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { conversationTabId } from "@/lib/eva-dashboard/conversation-tab";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Assign the open conversation to a design project (or clear assignment).
 */
export function ConversationProjectAssign({
  className,
}: {
  className?: string;
}) {
  const { conversationId } = useCurrentConversation();
  const { recents, patchRecent } = useAppContext();
  const { projects, refreshProjects } = useActiveProject();
  const [busy, setBusy] = useState(false);

  const recentId = conversationId ? conversationTabId(conversationId) : null;
  const projectIdFromRecent =
    recentId != null
      ? (recents.find((r) => r.id === recentId)?.projectId ?? null)
      : null;

  const current = projectIdFromRecent;

  const apply = async (next: string | null) => {
    if (!conversationId) return;
    setBusy(true);
    try {
      await apiPatch(API_ROUTES.conversation(conversationId), {
        projectId: next,
      });
      if (recentId) patchRecent(recentId, { projectId: next });
      await refreshProjects();
      toast.success(
        next
          ? "Conversation linked to project."
          : "Conversation unassigned from project.",
      );
    } catch {
      toast.error("Could not update project assignment.");
    } finally {
      setBusy(false);
    }
  };

  if (!conversationId) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Link2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      <select
        value={current ?? ""}
        disabled={busy}
        onChange={(e) => {
          const v = e.target.value;
          void apply(v === "" ? null : v);
        }}
        className="border-border bg-background text-foreground max-w-[160px] truncate rounded border px-1.5 py-0.5 text-[10px] outline-none disabled:opacity-50"
        aria-label="Assign conversation to project"
        title="Assign this chat to a project"
      >
        <option value="">Unassigned</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {busy ? (
        <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
      ) : null}
    </div>
  );
}
