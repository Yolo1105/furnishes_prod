import type { Conversation } from "@studio/store/types";

/**
 * Merge a server pull onto the in-memory conversation list for one
 * project. Keeps other projects untouched, prefers server rows, and
 * drops empty local-only threads that duplicate a server title so a
 * reload/retry cannot show two "Conversation 2" buttons.
 */
export function mergePulledConversations(
  local: Conversation[],
  projectId: string,
  server: Conversation[],
): Conversation[] {
  const otherProjects = local.filter((x) => x.projectId !== projectId);
  const localProject = local.filter((x) => x.projectId === projectId);
  const serverIds = new Set(server.map((row) => row.id));
  const serverTitles = new Set(server.map((row) => row.title));
  const localOnly = localProject.filter((x) => {
    if (serverIds.has(x.id)) return false;
    if (x.turns.length === 0 && serverTitles.has(x.title)) return false;
    return true;
  });
  return [...otherProjects, ...server, ...localOnly];
}
