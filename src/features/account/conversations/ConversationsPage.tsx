"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

type ConversationListItem = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  preview: string | null;
  messageCount: number;
  updatedAt: string;
};

type Filter = "All" | "Active";

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  return `${weeks}w`;
}

function statusBadge(status: string): { label: string; variant: string } {
  const normalized = status.toLowerCase();
  if (normalized === "archived") return { label: "Archived", variant: "mut" };
  return { label: "Active", variant: "on" };
}

/**
 * Route-owned Conversations list — studio table markup, real conversation APIs.
 * Archive/share filters and Prefs counts removed (unsupported / misleading).
 */
export function ConversationsPage({
  initialItems,
}: {
  initialItems: ConversationListItem[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => {
    const active = initialItems.filter(
      (i) => i.status.toLowerCase() !== "archived",
    ).length;
    return {
      All: initialItems.length,
      Active: active,
    };
  }, [initialItems]);

  const rows = useMemo(() => {
    if (filter === "All") return initialItems;
    return initialItems.filter(
      (item) => item.status.toLowerCase() !== "archived",
    );
  }, [filter, initialItems]);

  async function handleNewThread() {
    if (creating) return;
    setCreating(true);
    try {
      const created = await accountRequest<{ id: string }>(
        "/api/account/conversations",
        { method: "POST", body: JSON.stringify({}) },
      );
      router.push(`/account/conversations/${created.id}`);
    } catch {
      setCreating(false);
    }
  }

  const filters: Filter[] = ["All", "Active"];

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Design Work"
        title="Conversations"
        subtitle="Your threads with Eva, sortable, with status and last activity."
        actions={
          <button
            type="button"
            className="wf-btn"
            onClick={handleNewThread}
            disabled={creating}
          >
            + New thread
          </button>
        }
      />
      <div className="wf-tools">
        {filters.map((chip) => (
          <button
            key={chip}
            type="button"
            className={filter === chip ? "wf-chip on" : "wf-chip"}
            onClick={() => setFilter(chip)}
          >
            {chip}
            <span className="ct">{counts[chip]}</span>
          </button>
        ))}
      </div>
      <table className="wf-tbl">
        <thead>
          <tr>
            <th>Conversation</th>
            <th className="num">Messages</th>
            <th>Status</th>
            <th className="num">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const badge = statusBadge(row.status);
            const href = `/account/conversations/${row.id}`;
            return (
              <tr
                key={row.id}
                onClick={() => router.push(href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(href);
                  }
                }}
                tabIndex={0}
                role="link"
              >
                <td>
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="wf-tbl__t">{row.title}</div>
                    <div className="wf-tbl__d">
                      {row.preview ?? "No messages yet."}
                    </div>
                  </Link>
                </td>
                <td className="num">
                  <span className="wf-tbl__n">{row.messageCount}</span>
                </td>
                <td>
                  <span className={`wf-badge wf-badge--${badge.variant}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="num">
                  <span className="wf-tbl__m">{formatAgo(row.updatedAt)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AccountWireFrame>
  );
}
