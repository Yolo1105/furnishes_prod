import { PROJECT_SUMMARY_LIMITS } from "@/lib/eva/projects/summary-constants";

export type BriefSnapshotEntry = { key: string; value: string };

/**
 * Normalizes `Project.briefSnapshot` JSON for display (single implementation for hub + summary).
 */
export function parseBriefSnapshotEntries(
  snapshot: unknown,
  options?: { maxEntries?: number; maxValueLen?: number },
): BriefSnapshotEntry[] {
  const maxEntries =
    options?.maxEntries ?? PROJECT_SUMMARY_LIMITS.briefMaxEntriesSummary;
  const maxValueLen =
    options?.maxValueLen ?? PROJECT_SUMMARY_LIMITS.briefMaxValueLenSummary;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot))
    return [];
  const o = snapshot as Record<string, unknown>;
  return Object.entries(o)
    .slice(0, maxEntries)
    .map(([k, v]) => {
      const s =
        typeof v === "string"
          ? v
          : v != null && typeof v === "object"
            ? JSON.stringify(v)
            : String(v);
      return {
        key: k,
        value: s.slice(0, maxValueLen) + (s.length > maxValueLen ? "…" : ""),
      };
    });
}

/** Compact lines for inline hub lists (shorter than summary DTO). */
export function briefSnapshotLinesForUi(snapshot: unknown): string[] {
  return parseBriefSnapshotEntries(snapshot, {
    maxEntries: PROJECT_SUMMARY_LIMITS.briefMaxEntriesUi,
    maxValueLen: PROJECT_SUMMARY_LIMITS.briefMaxValueLenUi,
  }).map((e) => `${e.key}: ${e.value}`);
}
