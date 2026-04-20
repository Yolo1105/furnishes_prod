/**
 * Client-only: last opened conversation per project shell (and unassigned bucket).
 * Keys: real project id, or {@link UNASSIGNED_PROJECT_SHELL_KEY} for no active project.
 */

export const UNASSIGNED_PROJECT_SHELL_KEY = "";

const STORAGE_KEY = "furnishes.activeConversationByProject.v1";

export function storageKeyForActiveProject(
  projectId: string | null | undefined,
): string {
  return projectId ?? UNASSIGNED_PROJECT_SHELL_KEY;
}

function readMap(): Record<string, string> {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return {};
    const parsed = JSON.parse(v) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function writeMap(m: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** `projectKey` from {@link storageKeyForActiveProject}. */
export function getStoredActiveConversationId(
  projectKey: string,
): string | null {
  const id = readMap()[projectKey];
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function setStoredActiveConversationForProject(
  projectKey: string,
  conversationId: string | null,
) {
  const m = readMap();
  if (!conversationId) {
    delete m[projectKey];
  } else {
    m[projectKey] = conversationId;
  }
  writeMap(m);
}
