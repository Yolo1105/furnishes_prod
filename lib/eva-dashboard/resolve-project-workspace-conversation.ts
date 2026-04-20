import type { RecentItem } from "@/lib/eva-dashboard/types";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";
import { conversationTabId } from "@/lib/eva-dashboard/conversation-tab";
import {
  getStoredActiveConversationId,
  storageKeyForActiveProject,
} from "@/lib/eva-dashboard/project-active-conversation-storage";

export type ProjectWorkspaceConversationRow = {
  id: string;
  title: string;
  isSaved?: boolean;
  savedAt?: string | null;
  projectId?: string | null;
};

type ListPayload = { conversations: ProjectWorkspaceConversationRow[] };

async function fetchConversationsForShell(
  activeProjectId: string | null,
): Promise<ProjectWorkspaceConversationRow[]> {
  const data = await apiGet<ListPayload>(
    API_ROUTES.conversationsForProject(activeProjectId),
  );
  return data.conversations ?? [];
}

function metaFromApiRow(
  row: ProjectWorkspaceConversationRow,
  activeProjectId: string | null,
): Partial<Pick<RecentItem, "isSaved" | "savedAt" | "projectId">> {
  return {
    isSaved: row.isSaved ?? false,
    savedAt: row.savedAt ?? null,
    projectId: row.projectId ?? activeProjectId,
  };
}

/** Whether the open DB conversation belongs to the current project shell (recents must list it). */
export function openConversationMatchesActiveShell(
  openConversationId: string | null,
  recents: RecentItem[],
  activeProjectId: string | null,
): boolean {
  if (!openConversationId) return false;
  const rid = conversationTabId(openConversationId);
  const row = recents.find((r) => r.id === rid);
  const pid = row?.projectId ?? null;
  if (activeProjectId === null) {
    return pid === null || pid === undefined;
  }
  return pid === activeProjectId;
}

function rowFromStoredOrFirstInList(
  list: ProjectWorkspaceConversationRow[],
  activeProjectId: string | null,
): ProjectWorkspaceConversationRow | null {
  const key = storageKeyForActiveProject(activeProjectId);
  const stored = getStoredActiveConversationId(key);
  if (stored) {
    const hit = list.find((c) => c.id === stored);
    if (hit) return hit;
  }
  return list[0] ?? null;
}

/** Stored id if still in the project list, else most recently updated conversation (API order). */
async function pickStoredOrFirstRow(
  activeProjectId: string | null,
): Promise<ProjectWorkspaceConversationRow | null> {
  const list = await fetchConversationsForShell(activeProjectId);
  return rowFromStoredOrFirstInList(list, activeProjectId);
}

/**
 * After the user changes the active project (or clears it), pick which conversation tab
 * should own the shell — in order: stored id for that shell if still valid, else most
 * recent in list (API is `updatedAt desc`), else none.
 */
export type ConversationTabResolution =
  | {
      kind: "convo";
      tabId: string;
      title: string;
      meta: Partial<Pick<RecentItem, "isSaved" | "savedAt" | "projectId">>;
    }
  | { kind: "none" };

export async function resolveConversationTabAfterProjectChange(
  activeProjectId: string | null,
  recents: RecentItem[],
): Promise<ConversationTabResolution> {
  const list = await fetchConversationsForShell(activeProjectId);
  const key = storageKeyForActiveProject(activeProjectId);
  const stored = getStoredActiveConversationId(key);

  if (stored) {
    const fromApi = list.find((c) => c.id === stored);
    if (fromApi) {
      return {
        kind: "convo",
        tabId: `convo-${fromApi.id}`,
        title: fromApi.title,
        meta: metaFromApiRow(fromApi, activeProjectId),
      };
    }
    const fromRecents = recents.find(
      (r) => r.id === `convo-${stored}` && r.projectId === activeProjectId,
    );
    if (fromRecents && activeProjectId !== null) {
      return {
        kind: "convo",
        tabId: fromRecents.id,
        title: fromRecents.label,
        meta: {
          isSaved: fromRecents.isSaved ?? false,
          savedAt: fromRecents.savedAt ?? null,
          projectId: fromRecents.projectId ?? activeProjectId,
        },
      };
    }
    if (fromRecents && activeProjectId === null) {
      const pid = fromRecents.projectId ?? null;
      if (pid === null || pid === undefined) {
        return {
          kind: "convo",
          tabId: fromRecents.id,
          title: fromRecents.label,
          meta: {
            isSaved: fromRecents.isSaved ?? false,
            savedAt: fromRecents.savedAt ?? null,
            projectId: null,
          },
        };
      }
    }
  }

  const fallback = rowFromStoredOrFirstInList(list, activeProjectId);
  if (fallback) {
    return {
      kind: "convo",
      tabId: `convo-${fallback.id}`,
      title: fallback.title,
      meta: metaFromApiRow(fallback, activeProjectId),
    };
  }

  return { kind: "none" };
}

/**
 * Conversation id for Discover / Recommendations / Export: open chat if it matches shell,
 * else same stored → most-recent pick as project switch (single list fetch).
 */
export async function resolveSurfaceConversationId(
  activeProjectId: string | null,
  openConversationId: string | null,
  recents: RecentItem[],
): Promise<string | null> {
  if (
    openConversationMatchesActiveShell(
      openConversationId,
      recents,
      activeProjectId,
    )
  ) {
    return openConversationId;
  }
  const row = await pickStoredOrFirstRow(activeProjectId);
  return row?.id ?? null;
}
