"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, MessageSquare } from "lucide-react";
import type { ProjectCommentTargetType } from "@prisma/client";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  API_ROUTES,
} from "@/lib/eva-dashboard/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CommentAuthor = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type ProjectCommentRow = {
  id: string;
  body: string;
  createdAt: string;
  resolvedAt: string | null;
  authorUserId: string;
  author: CommentAuthor;
  replies?: ProjectCommentRow[];
};

type Props = {
  projectId: string;
  targetType: ProjectCommentTargetType;
  targetId: string;
  /** Section label — keep short for dense layouts */
  label?: string;
  compact?: boolean;
  /**
   * When true, do not fetch until the user opts in (keeps shortlist/task rows from N+1 loading).
   */
  deferLoad?: boolean;
  className?: string;
  onThreadsChanged?: () => void;
};

function authorLabel(a: CommentAuthor): string {
  return a.name?.trim() || a.email?.trim() || "Teammate";
}

export function ProjectTargetCommentsPanel({
  projectId,
  targetType,
  targetId,
  label = "Review",
  compact,
  deferLoad = false,
  className,
  onThreadsChanged,
}: Props) {
  const { data: session } = useSession();
  const viewerId = session?.user?.id ?? null;

  const [fetchEnabled, setFetchEnabled] = useState(!deferLoad);
  const [comments, setComments] = useState<ProjectCommentRow[]>([]);
  const [loading, setLoading] = useState(!deferLoad);
  const [mainBody, setMainBody] = useState("");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ comments: ProjectCommentRow[] }>(
        API_ROUTES.projectComments(projectId, { targetType, targetId }),
      );
      setComments(res.comments ?? []);
    } catch {
      toast.error("Could not load comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, targetType, targetId]);

  useEffect(() => {
    if (!fetchEnabled) return;
    void load();
  }, [fetchEnabled, load]);

  const openCount = useMemo(
    () =>
      comments.reduce((acc, c) => {
        const top = c.resolvedAt ? 0 : 1;
        const replies = c.replies ?? [];
        const openReplies = replies.filter((r) => !r.resolvedAt).length;
        return acc + top + openReplies;
      }, 0),
    [comments],
  );

  const submitTop = useCallback(async () => {
    const body = mainBody.trim();
    if (!body) return;
    setBusy("top");
    try {
      await apiPost(API_ROUTES.projectComments(projectId), {
        targetType,
        targetId,
        body,
        parentId: null,
      });
      setMainBody("");
      await load();
      onThreadsChanged?.();
      toast.success("Comment added");
    } catch {
      toast.error("Could not add comment");
    } finally {
      setBusy(null);
    }
  }, [mainBody, load, onThreadsChanged, projectId, targetId, targetType]);

  const submitReply = useCallback(
    async (parentId: string) => {
      const body = (replyDraft[parentId] ?? "").trim();
      if (!body) return;
      setBusy(`reply-${parentId}`);
      try {
        await apiPost(API_ROUTES.projectComments(projectId), {
          targetType,
          targetId,
          body,
          parentId,
        });
        setReplyDraft((prev) => ({ ...prev, [parentId]: "" }));
        setReplyOpen(null);
        await load();
        onThreadsChanged?.();
        toast.success("Reply added");
      } catch {
        toast.error("Could not reply");
      } finally {
        setBusy(null);
      }
    },
    [load, onThreadsChanged, projectId, replyDraft, targetId, targetType],
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (
        typeof window !== "undefined" &&
        !window.confirm("Delete this comment?")
      )
        return;
      setBusy(commentId);
      try {
        await apiDelete(API_ROUTES.projectComment(projectId, commentId));
        await load();
        onThreadsChanged?.();
        toast.success("Comment removed");
      } catch {
        toast.error("Could not delete comment");
      } finally {
        setBusy(null);
      }
    },
    [load, onThreadsChanged, projectId],
  );

  const toggleResolve = useCallback(
    async (commentId: string, resolved: boolean) => {
      setBusy(commentId);
      try {
        await apiPatch(API_ROUTES.projectComment(projectId, commentId), {
          resolved,
        });
        await load();
        onThreadsChanged?.();
        toast.success(resolved ? "Marked resolved" : "Reopened");
      } catch {
        toast.error("Could not update comment");
      } finally {
        setBusy(null);
      }
    },
    [load, onThreadsChanged, projectId],
  );

  if (!fetchEnabled) {
    return (
      <div
        className={cn(
          "border-border/80 rounded-md border border-dashed p-2",
          className,
        )}
      >
        <button
          type="button"
          className="text-primary text-[11px] font-medium underline"
          onClick={() => setFetchEnabled(true)}
        >
          Load review thread
        </button>
        <span className="text-muted-foreground ml-2 text-[10px]">
          {label ?? "Review"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/80 bg-muted/10 rounded-md border border-dashed",
        compact ? "p-2" : "p-3",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-[10px] font-semibold uppercase">
            {label}
          </span>
          {openCount > 0 ? (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 tabular-nums dark:text-amber-200">
              {openCount} open
            </span>
          ) : null}
        </div>
        {loading ? (
          <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
        ) : null}
      </div>

      {comments.length === 0 && !loading ? (
        <p className="text-muted-foreground mb-2 text-[11px] leading-snug">
          No notes yet — add a quick review comment for your team.
        </p>
      ) : (
        <ul className="mb-2 space-y-2 text-[11px]">
          {comments.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded border p-2",
                c.resolvedAt
                  ? "border-border/60 bg-muted/20 opacity-80"
                  : "border-border bg-background",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="text-foreground font-medium">
                  {authorLabel(c.author)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-foreground mt-1 leading-snug whitespace-pre-wrap">
                {c.body}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {viewerId ? (
                  <button
                    type="button"
                    className="text-primary text-[10px] font-medium underline disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() =>
                      setReplyOpen((prev) => (prev === c.id ? null : c.id))
                    }
                  >
                    Reply
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-muted-foreground text-[10px] underline disabled:opacity-50"
                  disabled={busy === c.id}
                  onClick={() => void toggleResolve(c.id, !c.resolvedAt)}
                >
                  {c.resolvedAt ? "Unresolve" : "Resolve"}
                </button>
                {viewerId && c.authorUserId === viewerId ? (
                  <button
                    type="button"
                    className="text-destructive/90 text-[10px] underline disabled:opacity-50"
                    disabled={busy === c.id}
                    onClick={() => void removeComment(c.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              {c.replies && c.replies.length > 0 ? (
                <ul className="border-border mt-2 space-y-1.5 border-l pl-2">
                  {c.replies.map((r) => (
                    <li key={r.id} className="text-[10px] leading-snug">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span>
                          <span className="text-foreground font-medium">
                            {authorLabel(r.author)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </span>
                        {viewerId && r.authorUserId === viewerId ? (
                          <button
                            type="button"
                            className="text-destructive/90 text-[10px] underline"
                            disabled={busy === r.id}
                            onClick={() => void removeComment(r.id)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                      <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                        {r.body}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {replyOpen === c.id ? (
                <div className="mt-2 space-y-1">
                  <textarea
                    className="border-border bg-background text-foreground w-full rounded border px-2 py-1 text-[11px]"
                    rows={2}
                    placeholder="Reply…"
                    value={replyDraft[c.id] ?? ""}
                    onChange={(e) =>
                      setReplyDraft((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50"
                    disabled={busy === `reply-${c.id}`}
                    onClick={() => void submitReply(c.id)}
                  >
                    Send reply
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1">
        <textarea
          className="border-border bg-background text-foreground w-full rounded border px-2 py-1.5 text-[11px]"
          rows={compact ? 2 : 3}
          placeholder="Add a review note…"
          value={mainBody}
          onChange={(e) => setMainBody(e.target.value)}
          disabled={!!busy && busy === "top"}
        />
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50"
          disabled={busy === "top" || !mainBody.trim()}
          onClick={() => void submitTop()}
        >
          {busy === "top" ? "Saving…" : "Add comment"}
        </button>
      </div>
    </div>
  );
}
