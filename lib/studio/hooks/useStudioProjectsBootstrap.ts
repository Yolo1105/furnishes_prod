"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Project } from "@studio/projects/types";
import {
  PLAYGROUND_DEMO_PROJECT_TITLE,
  studioProjectListFromBootstrap,
  studioProjectsSortedDemoFirst,
} from "@studio/projects/playground-demo-constants";
import { useStore } from "@studio/store";
import { emptyConversation } from "@studio/store/conversation-utils";

const RETRYABLE = new Set([401, 403, 429, 500, 502, 503, 504]);
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
      const r = await fetch(url, { ...init, signal });
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
}

/**
 * Ensures the user has at least one project and hydrates the Zustand
 * projects + chat seed from Postgres-backed `/api/studio/projects*`.
 *
 * Retries transient failures (401 before the session cookie is
 * visible, 503, 429) — a single-shot fetch often left `projects`
 * empty while the rest of the studio (GLB seed, inventory) still
 * ran, which matches “Loading…” + blank main canvas confusion.
 *
 * Partial success: if `ensure-starter` succeeds but the GET list
 * fails (rate-limit key exhaustion, transient 500, etc.), we still
 * commit the ensured row — never bail just because the list call
 * returned null.
 *
 * If ensure fails but GET succeeds (unlikely but possible), we
 * still hydrate from the list so the pill is not stuck on Loading.
 *
 * Conversation bootstrap: if the slice already has rows for the
 * focus project (SPA return), keep them; otherwise append one seed.
 * Never replace the entire `conversations` array — that would wipe
 * other projects’ threads still held in the global slice.
 */
export function useStudioProjectsBootstrap() {
  const { status } = useSession();

  useEffect(() => {
    // Avoid hammering `/api/studio/*` with 401s while SessionProvider is
    // still hydrating, or before the user is authenticated (middleware
    // should redirect, but this keeps dev consoles quiet).
    if (status !== "authenticated") return;
    if (useStore.getState().projects.length > 0) return;

    const ac = new AbortController();
    const signal = ac.signal;

    void (async () => {
      try {
        const ensuredBody = await fetchJsonWithRetry<{ project: Project }>(
          "/api/studio/projects/ensure-starter",
          { method: "POST", credentials: "include" },
          signal,
          "ensure-starter",
        );
        const ensured = ensuredBody?.project ?? null;

        const listBody = await fetchJsonWithRetry<{ projects?: Project[] }>(
          "/api/studio/projects",
          { credentials: "include" },
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
          focusId = ensured.id;
        } else if (raw.length > 0) {
          demoFirst = studioProjectsSortedDemoFirst(raw);
          focusId = demoFirst[0]!.id;
        } else {
          // Dev resilience: keep studio deterministic even when local API
          // auth/DB setup is flaky by pinning a local demo project.
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `${LOG_PREFIX} project bootstrap degraded; using local fallback project`,
            );
            demoFirst = [localFallbackProject()];
            focusId = demoFirst[0].id;
          } else {
            console.warn(
              `${LOG_PREFIX} project bootstrap: ensure-starter and projects list both unavailable — studio needs a signed-in session and STUDIO_ENABLED`,
            );
            return;
          }
        }

        mergeConversationsAndApply(focusId, demoFirst, signal);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.warn(`${LOG_PREFIX} project bootstrap error`, e);
        if (process.env.NODE_ENV !== "production" && !signal.aborted) {
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
  }, [status]);
}
