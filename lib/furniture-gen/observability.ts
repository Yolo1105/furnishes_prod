import "server-only";

/**
 * One JSON line per log entry — easy to ship to log drains (Axiom, Datadog, etc.).
 */
export function logFurnitureGeneration(
  payload: Record<string, string | number | boolean | null | undefined>,
): void {
  console.log(
    JSON.stringify({
      service: "furniture-generate",
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}
