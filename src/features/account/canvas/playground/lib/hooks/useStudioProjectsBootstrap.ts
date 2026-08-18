"use client";

import { useEffect } from "react";
import type { Project } from "@studio/projects/types";
import {
  PLAYGROUND_DEMO_PROJECT_TITLE,
  studioProjectBootstrapFocusId,
  studioProjectListFromBootstrap,
  studioProjectsSortedDemoFirst,
} from "@studio/projects/playground-demo-constants";
import { resetSceneForCurrentProject } from "@studio/projects/project-scene-reset";
import { useStore } from "@studio/store";
import { emptyConversation } from "@studio/store/conversation-utils";

/** Transient failures only — auth/schema errors fail fast to local fallback. */
const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
const LOG_PREFIX = "[studio]";
const LOCAL_FALLBACK_PROJECT_ID = "local-playground-demo";

function localFallbackProject(): Project {
  return {
    id: LOCAL_FALLBACK_PROJECT_ID,
    name: PLAYGROUND_DEMO_PROJECT_TITLE,
    updated: "just now",
  };
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(t);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchJsonWithRetry<T>(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  context: string,
): Promise<T | null> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (signal.aborted) return null;
    try {
      const r = await fetch(url, { ...init, signal, credentials: "include" });
      if (r.ok) {
        return (await r.json()) as T;
      }
      if (!RETRYABLE.has(r.status) || i === MAX_ATTEMPTS - 1) {
        console.warn(
          `${LOG_PREFIX} ${context} failed`,
          r.status,
          await r.text().catch(() => ""),
        );
        return null;
      }
    } catch (e) {
      if (signal.aborted) return null;
      if (i === MAX_ATTEMPTS - 1) {
        console.warn(`${LOG_PREFIX} ${context} network error`, e);
        return null;
      }
    }
    await sleep(250 * (i + 1), signal);
  }
  return null;
}

function mergeConversationsAndApply(
  focusId: string,
  demoFirst: Project[],
  signal: AbortSignal,
) {
  if (signal.aborted) return;

  const slice = useStore.getState();
  const existingConversations = slice.conversations ?? [];
  const forFocus = existingConversations.filter((c) => c.projectId === focusId);

  let nextConversations = existingConversations;
  let activeConversationId: string;

  if (forFocus.length > 0) {
    activeConversationId = [...forFocus].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )[0]!.id;
  } else {
    const seed = emptyConversation(focusId);
    activeConversationId = seed.id;
    nextConversations = [
      ...existingConversations.filter((c) => c.projectId !== focusId),
      seed,
    ];
  }

  useStore.setState({
    projects: demoFirst,
    currentProjectId: focusId,
    conversations: nextConversations,
    activeConversationId,
  });

  // Align the 3D shell with the focused project before persistence hydrate.
  resetSceneForCurrentProject();
}

/**
 * Account bootstrap — uses `/api/studio/projects*` (session cookie) with
 * IndexedDB fallback for snapshots.
 */
export function useStudioProjectsBootstrap() {
  useEffect(() => {
    if (useStore.getState().projects.length > 0) return;

    const ac = new AbortController();
    const signal = ac.signal;

    void (async () => {
      try {
        const ensuredBody = await fetchJsonWithRetry<{ project: Project }>(
          "/api/studio/projects/ensure-starter",
          { method: "POST" },
          signal,
          "ensure-starter",
        );
        const ensured = ensuredBody?.project ?? null;

        const listBody = await fetchJsonWithRetry<{ projects?: Project[] }>(
          "/api/studio/projects",
          {},
          signal,
          "projects list",
        );

        const raw =
          listBody === null
            ? []
            : Array.isArray(listBody.projects)
              ? listBody.projects
              : [];

        let demoFirst: Project[];
        let focusId: string;

        if (ensured) {
          demoFirst = studioProjectListFromBootstrap(raw, ensured);
          focusId = studioProjectBootstrapFocusId(demoFirst);
        } else if (raw.length > 0) {
          demoFirst = studioProjectsSortedDemoFirst(raw);
          focusId = studioProjectBootstrapFocusId(demoFirst);
        } else {
          console.warn(
            `${LOG_PREFIX} project bootstrap degraded; using local fallback project`,
          );
          demoFirst = [localFallbackProject()];
          focusId = LOCAL_FALLBACK_PROJECT_ID;
        }

        mergeConversationsAndApply(focusId, demoFirst, signal);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.warn(`${LOG_PREFIX} project bootstrap error`, e);
        if (!signal.aborted) {
          mergeConversationsAndApply(
            LOCAL_FALLBACK_PROJECT_ID,
            [localFallbackProject()],
            signal,
          );
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, []);
}
