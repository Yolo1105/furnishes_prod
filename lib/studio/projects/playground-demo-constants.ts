import type { Project } from "@studio/projects/types";
import {
  STUDIO_PLAYGROUND_PATH_PREFIX,
  isStudioPlaygroundPathname,
} from "@/lib/routes/studio-playground-path";

/**
 * Canonical Furnishes Studio / playground showcase project.
 * `POST /api/studio/projects/ensure-starter` finds or creates a row with
 * this exact title so the client can default-select it; users can still
 * switch to any other project from the switcher or "See all projects".
 *
 * If a user renames this project, the next ensure-starter may create a
 * fresh row with the same title — avoid renaming if you rely on a single
 * stable demo id across environments.
 */
export const PLAYGROUND_DEMO_PROJECT_TITLE = "Demo apartment" as const;

/** Re-export for studio modules that already import this file. */
export {
  STUDIO_PLAYGROUND_PATH_PREFIX as PLAYGROUND_PATH_PREFIX,
  isStudioPlaygroundPathname as isPlaygroundPathname,
};

/** Matches `LOADING_PROJECT_PLACEHOLDER.name` in projects-slice — one string. */
export const STUDIO_PROJECTS_LOADING_NAME = "Loading…" as const;

function projectRowKey(p: Project): string {
  if (p.id) return p.id;
  return `${p.name}:${p.updated}`;
}

function sortDemoFirstUpdatedDesc(list: Project[]): Project[] {
  return [...list].sort((a, b) => {
    const aDemo = a.name === PLAYGROUND_DEMO_PROJECT_TITLE ? 0 : 1;
    const bDemo = b.name === PLAYGROUND_DEMO_PROJECT_TITLE ? 0 : 1;
    if (aDemo !== bDemo) return aDemo - bDemo;
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}

/** Dedupe and sort (demo title first, then `updated` descending). */
export function studioProjectsSortedDemoFirst(projects: Project[]): Project[] {
  const map = new Map<string, Project>();
  for (const p of projects) {
    map.set(projectRowKey(p), p);
  }
  return sortDemoFirstUpdatedDesc(Array.from(map.values()));
}

/**
 * Merge GET list with the ensured starter row, dedupe by id (or name+updated
 * fallback), sort demo title first then `updated` descending.
 */
export function studioProjectListFromBootstrap(
  raw: Project[],
  ensured: Project,
): Project[] {
  const map = new Map<string, Project>();
  for (const p of raw) {
    map.set(projectRowKey(p), p);
  }
  map.set(projectRowKey(ensured), ensured);
  return sortDemoFirstUpdatedDesc(Array.from(map.values()));
}
