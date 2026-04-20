"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Trash2,
  Share2,
  ExternalLink,
} from "lucide-react";
import {
  PageHeader,
  FilterBar,
  SearchInput,
  SegmentedFilter,
  DataTable,
  EmptyState,
  StatusBadge,
  LinkButton,
  ConfirmDialog,
  useToast,
  type Column,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/formatters";
import type { ConversationSummary } from "@/lib/site/account/types";

type Filter = "all" | "active" | "archived" | "shared";

export function ConversationsView({
  initial,
}: {
  initial: ConversationSummary[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ConversationSummary[]>(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (needle && !`${r.title} ${r.snippet}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, q, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      archived: rows.filter((r) => r.status === "archived").length,
      shared: rows.filter((r) => r.status === "shared").length,
    }),
    [rows],
  );

  const deleteIds = async (ids: string[]) => {
    startTransition(async () => {
      for (const id of ids) {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          toast.error("Could not delete a conversation.");
          return;
        }
      }
      setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
      toast.success(ids.length === 1 ? "Conversation deleted" : "Deleted");
      router.refresh();
    });
  };

  const columns: Column<ConversationSummary>[] = [
    {
      id: "title",
      header: "Conversation",
      sortable: true,
      sortAccessor: (r) => r.title,
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-foreground flex items-center gap-2 truncate font-medium">
            <MessageSquare className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            {r.title}
          </div>
          <div className="text-muted-foreground mt-0.5 truncate text-xs">
            {r.snippet || "—"}
          </div>
        </div>
      ),
    },
    {
      id: "messages",
      header: "Messages",
      align: "right",
      width: "w-28",
      sortable: true,
      sortAccessor: (r) => r.messageCount,
      hiddenOnMobile: true,
      cell: (r) => (
        <span className="text-foreground text-sm tabular-nums">
          {r.messageCount}
        </span>
      ),
    },
    {
      id: "prefs",
      header: "Prefs",
      align: "right",
      width: "w-20",
      sortable: true,
      sortAccessor: (r) => r.inferredPreferenceCount,
      hiddenOnMobile: true,
      cell: (r) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {r.inferredPreferenceCount}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "w-32",
      cell: (r) => <StatusBadge variant={r.status} />,
    },
    {
      id: "updated",
      header: "Last activity",
      width: "w-36",
      sortable: true,
      sortAccessor: (r) => r.updatedAt,
      hiddenOnMobile: true,
      cell: (r) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {relativeTime(r.updatedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "w-10",
      cell: (r) => (
        <RowMenu
          row={r}
          onDelete={() => setConfirmDelete([r.id])}
          disabled={pending}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="DIALOGUE"
        title="Conversations"
        subtitle="Threads with Eva — open one for detail or continue in the assistant."
        actions={
          <LinkButton
            href="/chatbot"
            variant="primary"
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            New conversation
          </LinkButton>
        }
      />

      <PreviewBanner />

      <FilterBar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search conversations…"
          className="min-w-0 flex-1"
        />
        <SegmentedFilter
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "active", label: "Active", count: counts.active },
            { value: "archived", label: "Archived", count: counts.archived },
            { value: "shared", label: "Shared", count: counts.shared },
          ]}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={q ? "No conversations match" : "No conversations yet"}
          body={
            q
              ? "Try a different search, or clear filters."
              : "Start a new thread with Eva and your conversations land here."
          }
          cta={
            <LinkButton
              href="/chatbot"
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              New conversation
            </LinkButton>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowHref={(r) =>
            `/account/conversations/${encodeURIComponent(r.id)}`
          }
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void deleteIds(confirmDelete);
          setConfirmDelete(null);
        }}
        title={`Delete ${confirmDelete?.length ?? 0} conversation${confirmDelete?.length === 1 ? "" : "s"}?`}
        body="This removes the thread and related data. This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

function RowMenu({
  row,
  onDelete,
  disabled,
}: {
  row: ConversationSummary;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const share = async () => {
    try {
      const res = await fetch(`/api/conversations/${row.id}/share`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Could not create a share link.");
        return;
      }
      const data = (await res.json()) as { shareUrl?: string };
      if (data.shareUrl && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success("Share link copied");
      } else if (data.shareUrl) {
        toast.info(data.shareUrl);
      }
    } catch {
      toast.error("Share failed");
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Actions"
        className="hover:bg-muted text-muted-foreground inline-flex h-7 w-7 items-center justify-center transition-colors"
      >
        ⋯
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10 cursor-pointer"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="border-border bg-popover absolute top-full right-0 z-20 mt-1 w-48 border p-1 shadow-md"
          >
            <Link
              href={`/chatbot?conversationId=${encodeURIComponent(row.id)}`}
              className="text-foreground hover:bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Eva
            </Link>
            <button
              type="button"
              onClick={() => {
                void share();
                setOpen(false);
              }}
              className="text-foreground hover:bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Copy share link
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="text-destructive hover:bg-destructive/5 flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
