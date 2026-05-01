import type { Project } from "./types";

/** Relative label for the project switcher (Studio UI). */
export function formatProjectUpdated(updatedAt: Date): string {
  const ms = Date.now() - updatedAt.getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
  return updatedAt.toLocaleDateString();
}

export function prismaRowToStudioProject(p: {
  id: string;
  title: string;
  updatedAt: Date;
}): Project {
  return {
    id: p.id,
    name: p.title,
    updated: formatProjectUpdated(p.updatedAt),
  };
}
