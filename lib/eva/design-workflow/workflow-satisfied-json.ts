/**
 * Normalizes `Project.workflowSatisfied` JSON to boolean flags only.
 * Single implementation for evaluator + transitions (no duplicate parsers).
 */
export function parseWorkflowSatisfied(raw: unknown): Record<string, boolean> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "boolean") out[k] = v;
    }
    return out;
  }
  return {};
}
