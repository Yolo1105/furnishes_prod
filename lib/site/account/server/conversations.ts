import "server-only";

import { prisma } from "@/lib/db/prisma";
import type {
  AccountConversationDetail,
  ConversationMessage,
  ConversationSummary,
} from "@/lib/site/account/types";

function mapMessageRole(role: string): "user" | "eva" {
  const r = role.toLowerCase();
  if (r === "user" || r === "human") return "user";
  return "eva";
}

function extractionLabel(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const pref =
    typeof o.learnedPreference === "string"
      ? o.learnedPreference
      : typeof o.preference === "string"
        ? o.preference
        : undefined;
  return pref;
}

export async function getAccountConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      project: { select: { title: true } },
      _count: { select: { preferences: true } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    snippet: (c.snippet ?? "").slice(0, 280),
    messageCount: c.messageCount,
    inferredPreferenceCount: c._count.preferences,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export async function getAccountConversationDetail(
  userId: string,
  id: string,
): Promise<AccountConversationDetail | null> {
  const row = await prisma.conversation.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      project: { select: { id: true, title: true } },
      conversationShares: {
        include: {
          sharedWithUser: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { preferences: true } },
    },
  });
  if (!row) return null;

  const summary: ConversationSummary = {
    id: row.id,
    title: row.title,
    snippet: (row.snippet ?? "").slice(0, 280),
    messageCount: row.messageCount,
    inferredPreferenceCount: row._count.preferences,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };

  const messages: ConversationMessage[] = row.messages.map((m) => ({
    id: m.id,
    role: mapMessageRole(m.role),
    content: m.content,
    at: m.createdAt.toISOString(),
    learnedPreferenceLabel: extractionLabel(m.extractions),
  }));

  const sharedWith = row.conversationShares.map((s) => {
    const name =
      s.sharedWithUser.name?.trim() ||
      s.sharedWithUser.email?.split("@")[0] ||
      "Collaborator";
    const initials = name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return { id: s.sharedWithUser.id, name, initials };
  });

  return {
    summary,
    messages,
    projectId: row.project?.id ?? null,
    projectName: row.project?.title ?? null,
    sharedWith,
    tags: [],
  };
}
