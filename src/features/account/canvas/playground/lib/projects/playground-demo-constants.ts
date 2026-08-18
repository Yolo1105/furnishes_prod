import type { Project } from "@studio/projects/types";
import {
  STUDIO_PLAYGROUND_PATH_PREFIX,
  isStudioPlaygroundPathname,
} from "@studio/routes/studio-playground-path";
import {
  PLAYGROUND_BLANK_PROJECT_TITLE,
  PLAYGROUND_DEMO_PROJECT_TITLE,
} from "@/shared/canvas/playground-project-titles";
export {
  PLAYGROUND_BLANK_PROJECT_TITLE,
  PLAYGROUND_DEMO_PROJECT_TITLE,
};

/**
 * Default first-boot project — apartamento.glb showcase ("Demo apartment").
 * `POST /api/studio/projects/ensure-starter` still ensures Blank Canvas exists
 * but returns the demo row for client focus.
 */

/** True when this project is the apartamento.glb showcase. */
export function isPlaygroundDemoApartmentProject(
  project: { name?: string; blankScene?: boolean } | null | undefined,
): boolean {
  if (!project) return false;
  if (project.blankScene) return false;
  return project.name === PLAYGROUND_DEMO_PROJECT_TITLE;
}

/** Re-export for studio modules that already import this file. */
export {
  STUDIO_PLAYGROUND_PATH_PREFIX as PLAYGROUND_PATH_PREFIX,
  isStudioPlaygroundPathname as isPlaygroundPathname,
};

/** Matches `LOADING_PROJECT_PLACEHOLDER.name` in projects-slice — one string. */
export const STUDIO_PROJECTS_LOADING_NAME = "Loading…" as const;

/**
 * Resolve project id from brain API request bodies.
 * Client sends the live store UUID; no hardcoded standalone default.
 */
export function resolvePlaygroundProjectId(raw: unknown): string {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed.slice(0, 160);
  }
  return "unknown";
}

function projectRowKey(p: Project): string {
  if (p.id) return p.id;
  return `${p.name}:${p.updated}`;
}

function sortDemoFirstUpdatedDesc(list: Project[]): Project[] {
  return [...list].sort((a, b) => {
    const rank = (p: Project) => {
      if (p.name === PLAYGROUND_DEMO_PROJECT_TITLE && !p.blankScene) return 0;
      if (p.blankScene || p.name === PLAYGROUND_BLANK_PROJECT_TITLE) return 1;
      return 2;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}

/** Pick the default bootstrap focus — Demo apartment when present. */
export function studioProjectBootstrapFocusId(projects: Project[]): string {
  const sorted = sortDemoFirstUpdatedDesc(projects);
  const demo = sorted.find((p) => isPlaygroundDemoApartmentProject(p));
  return (demo ?? sorted[0])!.id;
}

/** Dedupe and sort (demo first, then blank starter, then `updated` desc). */
export function studioProjectsSortedDemoFirst(projects: Project[]): Project[] {
  const map = new Map<string, Project>();
  for (const p of projects) {
    map.set(projectRowKey(p), p);
  }
  return sortDemoFirstUpdatedDesc(Array.from(map.values()));
}

/**
 * Merge GET list with the ensured starter row, dedupe by id (or name+updated
 * fallback), sort demo first then blank then `updated` descending.
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
