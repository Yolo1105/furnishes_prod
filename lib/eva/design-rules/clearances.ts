/**
 * Industry-standard interior design clearances (inches).
 * Deterministic, testable — no hallucination risk.
 */

export type PathType = "typical" | "major" | "between-furniture";

/**
 * Walkway clearance in inches.
 * - typical: 36 inches (e.g. hallway, general circulation)
 * - major: 42 inches (main paths, accessible routes)
 * - between-furniture: 30 inches (e.g. between sofa and coffee table)
 */
export function getWalkwayClearance(pathType: PathType): number {
  switch (pathType) {
    case "typical":
      return 36;
    case "major":
      return 42;
    case "between-furniture":
      return 30;
    default:
      return 36;
  }
}

/**
 * Minimum clearances around a bed (inches).
 * - Sides: 24 inches each
 * - Foot: 36 inches
 */
export function getMinBedClearance(): { sides: number; foot: number } {
  return { sides: 24, foot: 36 };
}

export type DeskUsage = "laptop" | "desktop" | "drafting";

/**
 * Recommended desk depth in inches by usage.
 */
export function getDeskDepth(usage: DeskUsage): number {
  switch (usage) {
    case "laptop":
      return 24;
    case "desktop":
      return 30;
    case "drafting":
      return 36;
    default:
      return 24;
  }
}
