/**
 * Schedule work that should outlive the HTTP response when the platform
 * supports it (Next.js `after()`), otherwise fall back to fire-and-forget.
 */

import { createRequire } from "node:module";

type AfterFn = (task: () => void | Promise<void>) => void;

function resolveAfter(): AfterFn | null {
  try {
    const require = createRequire(import.meta.url);
    const mod = require("next/server") as { after?: AfterFn };
    return typeof mod.after === "function" ? mod.after.bind(mod) : null;
  } catch {
    return null;
  }
}

function runFallback(task: () => void | Promise<void>): void {
  void Promise.resolve(task()).catch(() => {
    /* callers log their own failures */
  });
}

/**
 * Run `task` after the response is sent when `after()` is available;
 * otherwise start it immediately without awaiting (legacy behavior).
 * If `after()` throws (e.g. outside a request scope), falls back.
 */
export function runAfterResponse(task: () => void | Promise<void>): void {
  const after = resolveAfter();
  if (!after) {
    runFallback(task);
    return;
  }
  try {
    after(() => {
      void Promise.resolve(task()).catch(() => {
        /* callers log their own failures */
      });
    });
  } catch {
    runFallback(task);
  }
}
