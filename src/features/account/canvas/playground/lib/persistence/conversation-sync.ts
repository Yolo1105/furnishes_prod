"use client";

/**
 * Client-side conversation sync engine. Bridges local Zustand state
 * with `/api/conversations*` (Account session cookie + Prisma).
 *
 * Sync model:
 *   - LOCAL FIRST — UI never waits on the network.
 *   - SERVER ASYNC — fire-and-forget after local writes.
 *   - PULL ON HYDRATE — GET conversations + messages on project open.
 */

import { useStore } from "@studio/store";
import type { Conversation, ConversationTurn } from "@studio/store/types";
import { mergePulledConversations } from "./conversation-merge";

interface ConversationRow {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  user_text: string;
  response: string;
  display_time: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  position_hint: number;
}

const fetchInit: RequestInit = { credentials: "include" };

function rowToConversation(
  row: ConversationRow,
  turns: ConversationTurn[] = [],
): Conversation {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    turns,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function messageRowToTurn(row: MessageRow): ConversationTurn {
  const numericId = (() => {
    if (row.metadata && typeof row.metadata.localId === "number") {
      return row.metadata.localId as number;
    }
    return new Date(row.created_at).getTime();
  })();
  return {
    id: numericId,
    userText: row.user_text,
    response: row.response,
    time: row.display_time,
  };
}

export async function pullConversationsForProject(projectId: string): Promise<{
  kind: "ok" | "no-auth" | "unavailable" | "error";
  count?: number;
}> {
  try {
    const listRes = await fetch(
      `/api/conversations?projectId=${encodeURIComponent(projectId)}`,
      fetchInit,
    );
    if (listRes.status === 503) return { kind: "unavailable" };
    if (listRes.status === 401 || listRes.status === 403) {
      return { kind: "no-auth" };
    }
    if (!listRes.ok) return { kind: "error" };
    const { conversations } = (await listRes.json()) as {
      conversations: ConversationRow[];
    };

    const turnsByConvo = new Map<string, ConversationTurn[]>();
    await Promise.all(
      conversations.map(async (c) => {
        try {
          const mRes = await fetch(
            `/api/conversations/${encodeURIComponent(c.id)}/messages`,
            fetchInit,
          );
          if (!mRes.ok) return;
          const { messages } = (await mRes.json()) as {
            messages: MessageRow[];
          };
          turnsByConvo.set(c.id, messages.map(messageRowToTurn));
        } catch {
          // best-effort
        }
      }),
    );

    useStore.setState((curr) => {
      const c = curr as unknown as { conversations: Conversation[] };
      const merged = conversations.map((r) =>
        rowToConversation(r, turnsByConvo.get(r.id) ?? []),
      );
      return {
        conversations: mergePulledConversations(
          c.conversations,
          projectId,
          merged,
        ),
      } as never;
    });

    return { kind: "ok", count: conversations.length };
  } catch {
    return { kind: "error" };
  }
}

export async function pushNewConversation(c: Conversation): Promise<void> {
  try {
    await fetch("/api/conversations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: c.id,
        projectId: c.projectId,
        title: c.title,
      }),
    });
  } catch {
    // best-effort
  }
}

export async function pushRename(id: string, title: string): Promise<void> {
  try {
    await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  } catch {
    // best-effort
  }
}

export async function pushDelete(id: string): Promise<void> {
  try {
    await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    // best-effort
  }
}

export async function pushTurn(
  conversationId: string,
  turn: ConversationTurn,
): Promise<void> {
  try {
    await fetch(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `msg_${turn.id.toString(36)}`,
          userText: turn.userText,
          response: turn.response,
          displayTime: turn.time,
          metadata: { localId: turn.id },
        }),
      },
    );
  } catch {
    // best-effort
  }
}

/** @deprecated Server sync is always attempted when signed in. */
export function isServerUnavailable(): boolean {
  return false;
}
