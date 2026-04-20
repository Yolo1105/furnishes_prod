"use client";

import { useState, useEffect, useCallback } from "react";
import { List, Loader2, Star } from "lucide-react";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";

const PAGE_SIZE = 20;

interface HistoryViewProps {
  onItemClick: (
    id: string,
    label: string,
    meta?: { isSaved?: boolean; savedAt?: string | null },
  ) => void;
}

export function HistoryView({ onItemClick }: HistoryViewProps) {
  const [conversations, setConversations] = useState<
    {
      id: string;
      title: string;
      isSaved?: boolean;
      savedAt?: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback((off: number, append: boolean) => {
    if (off === 0) setLoading(true);
    else setLoadingMore(true);
    const url = `${API_ROUTES.conversations}?limit=${PAGE_SIZE}&offset=${off}`;
    apiGet<{
      conversations: {
        id: string;
        title: string;
        isSaved?: boolean;
        savedAt?: string | null;
      }[];
      hasMore: boolean;
    }>(url)
      .then((data) => {
        const list = data.conversations ?? [];
        setConversations((prev) => (append ? [...prev, ...list] : list));
        setHasMore(data.hasMore ?? false);
        setOffset(off + list.length);
      })
      .catch(() => (off === 0 ? setConversations([]) : null))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-foreground mb-2 flex items-center gap-2 text-base font-semibold">
        <List className="h-4 w-4" />
        Conversation history
      </h1>
      <p className="text-muted-foreground mb-4 text-sm">
        Open a past conversation from the list below.
      </p>
      {conversations.length === 0 && !loading ? (
        <p className="text-muted-foreground text-sm">
          No conversations yet. Start a new chat to see them here.
        </p>
      ) : (
        <>
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() =>
                    onItemClick(`convo-${c.id}`, c.title, {
                      isSaved: c.isSaved,
                      savedAt: c.savedAt ?? null,
                    })
                  }
                  className="border-border bg-card hover:bg-muted flex w-full items-center gap-2 rounded-lg border px-4 py-2 text-left text-sm font-medium transition-colors"
                >
                  {c.isSaved && (
                    <Star
                      className="fill-primary text-primary h-3.5 w-3.5 shrink-0"
                      aria-label="Saved"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => loadPage(offset, true)}
              disabled={loadingMore}
              className="text-muted-foreground hover:text-foreground border-border mt-3 w-full rounded-lg border py-2 text-sm disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Load more"
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
