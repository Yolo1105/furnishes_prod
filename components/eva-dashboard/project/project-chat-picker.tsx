"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";

/**
 * When an active project is set but no conversation tab is focused, offer chats in that project.
 */
export function ProjectChatPicker({
  title = "Open a chat in this project",
  className,
}: {
  title?: string;
  className?: string;
}) {
  const ctx = useActiveProjectOptional();
  const { onItemClick } = useAppContext();
  const [rows, setRows] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pid = ctx?.activeProjectId;
    if (!pid) {
      setRows([]);
      return;
    }
    setLoading(true);
    apiGet<{
      conversations: { id: string; title: string }[];
    }>(API_ROUTES.conversationsForProject(pid))
      .then((d) => setRows(d.conversations ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [ctx?.activeProjectId]);

  if (!ctx?.activeProjectId) return null;

  return (
    <div className={className}>
      <p className="text-foreground mb-2 text-sm font-medium">{title}</p>
      {loading ? (
        <p className="text-muted-foreground text-xs">Loading chats…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No chats in this project yet. Send a message in chat with this project
          selected as active.
        </p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto text-left">
          {rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onItemClick(`convo-${c.id}`, c.title)}
                className="text-primary hover:text-primary/80 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
