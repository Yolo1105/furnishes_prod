import "server-only";

type Level = "info" | "warn" | "error";

/**
 * Structured server logging. Prefer this over raw `console.*` in API routes,
 * middleware (via dynamic import if needed), and server actions.
 */
export function serverLog(
  level: Level,
  event: string,
  meta?: Record<string, unknown>,
): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  const msg = JSON.stringify(line);
  if (level === "error") console.error(msg);
  else if (level === "warn") console.warn(msg);
  else console.log(msg);
}
