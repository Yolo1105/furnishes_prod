type OpsLogLevel = "info" | "warn" | "error";

type OpsLogFields = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Structured ops logs (JSON lines). Safe for aggregators; never log secrets
 * or message bodies.
 */
export function logOps(
  level: OpsLogLevel,
  event: string,
  fields: OpsLogFields = {},
): void {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") {
    console.error(`[ops] ${line}`);
    return;
  }
  if (level === "warn") {
    console.warn(`[ops] ${line}`);
    return;
  }
  console.info(`[ops] ${line}`);
}

export function requestIdFromHeaders(
  headers: Headers,
  fallback = crypto.randomUUID(),
): string {
  const incoming =
    headers.get("x-request-id")?.trim() ||
    headers.get("x-correlation-id")?.trim();
  return incoming && incoming.length <= 128 ? incoming : fallback;
}
