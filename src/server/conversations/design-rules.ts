/**
 * Deterministic interior-design rule tables injected into the chat system prompt
 * when the user message mentions layout/placement keywords.
 *
 * Re-derived from legacy `lib/eva/design-rules/` (clearances + rug sizing).
 * Layout planner graph planning is intentionally omitted in Phase 1 — static
 * appendices only.
 */

type PathType = "typical" | "major" | "between-furniture";
type DeskUsage = "laptop" | "desktop" | "drafting";
type SofaRugConfig = "all-legs-on" | "front-legs-on" | "no-legs";
type BedSize = "twin" | "queen" | "king";

/** Walkway clearance in inches. */
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

/** Minimum clearances around a bed (inches). */
export function getMinBedClearance(): { sides: number; foot: number } {
  return { sides: 24, foot: 36 };
}

/** Recommended desk depth in inches by usage. */
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

/**
 * Living room rug size based on sofa width and placement.
 * - all-legs-on: rug extends 18–24" beyond sofa on each side
 * - front-legs-on: rug extends 12–18" beyond front legs
 * - no-legs: rug 6–12" beyond sofa (runner or accent)
 */
export function getRugSize(
  sofaWidthInches: number,
  config: SofaRugConfig,
): { width: number; length: number } {
  const extension =
    config === "all-legs-on" ? 24 : config === "front-legs-on" ? 18 : 10;
  return {
    width: sofaWidthInches + extension * 2,
    length: Math.round((sofaWidthInches + extension * 2) * 1.4),
  };
}

/** Dining rug: add 24 inches on each side of table for chair pullout. */
export function getDiningRugSize(
  tableWidthInches: number,
  tableLengthInches: number,
): { width: number; length: number } {
  const pullout = 24;
  return {
    width: tableWidthInches + pullout * 2,
    length: tableLengthInches + pullout * 2,
  };
}

const BED_DIMENSIONS: Record<BedSize, { width: number; length: number }> = {
  twin: { width: 38, length: 75 },
  queen: { width: 60, length: 80 },
  king: { width: 76, length: 80 },
};

/** Bedroom rug: extend 18–24 inches on sides and foot. */
export function getBedroomRugSize(bedSize: BedSize): {
  width: number;
  length: number;
} {
  const bed = BED_DIMENSIONS[bedSize];
  const extension = 24;
  return {
    width: bed.width + extension * 2,
    length: bed.length + extension,
  };
}

/**
 * Approximate rectangular dining table footprint (inches) by seat count.
 * Width is the shorter side; length grows with capacity.
 */
export function getDiningTableSize(seatCount: number): {
  width: number;
  length: number;
} | null {
  if (seatCount <= 2) return { width: 30, length: 36 };
  if (seatCount <= 4) return { width: 36, length: 48 };
  if (seatCount <= 6) return { width: 36, length: 72 };
  if (seatCount <= 8) return { width: 40, length: 96 };
  if (seatCount <= 10) return { width: 42, length: 120 };
  return null;
}

/**
 * Comfortable TV viewing distance band (inches) for a diagonal in inches.
 * Rule of thumb: ~1.5× to 2.5× diagonal.
 */
export function getTvViewingDistance(diagonalInches: number): {
  minInches: number;
  maxInches: number;
} {
  return {
    minInches: Math.round(diagonalInches * 1.5),
    maxInches: Math.round(diagonalInches * 2.5),
  };
}

const LAYOUT_TRIGGER_KEYWORDS = [
  "layout",
  "arrange",
  "arrangement",
  "placement",
  "clearance",
  "clearances",
  "rug",
  "where should i put",
  "floor plan",
  "walkway",
  "space between",
  "how much space",
  "how much room",
  "distance between",
  "circulation",
  "desk depth",
  "desk size",
  "tv distance",
  "viewing distance",
  "dining table",
  "seats",
];

/**
 * When the query mentions design-rule topics, return a deterministic appendix
 * for the system prompt. Returns null when no rule topic is detected.
 */
export function lookupDesignRules(message: string): string | null {
  const lower = message.toLowerCase();
  if (!LAYOUT_TRIGGER_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return null;
  }

  const lines: string[] = [];

  const wantsBed =
    /\bbed\b|bedroom|side of bed|foot of bed|around the bed/.test(lower);
  const wantsDesk =
    /\bdesk\b|desk depth|desk size|laptop desk|desktop desk|drafting/.test(
      lower,
    );
  const wantsRug =
    /\brug\b|rug size|sofa rug|living room rug|dining rug|table rug|bedroom rug|under the table|rug under/.test(
      lower,
    );
  const wantsDining =
    /dining table|seats?\s+\d+|table for\s+\d+|dining capacity/.test(lower);
  const wantsTv = /\btv\b|television|viewing distance|screen size/.test(lower);

  // Baseline circulation for any design-rule trigger.
  const typical = getWalkwayClearance("typical");
  const major = getWalkwayClearance("major");
  const between = getWalkwayClearance("between-furniture");
  lines.push(
    `Walkway clearances: typical path ${typical} inches, major path ${major} inches, between furniture ${between} inches.`,
  );

  if (wantsBed) {
    const bed = getMinBedClearance();
    lines.push(
      `Bed clearances: minimum ${bed.sides} inches on each side, ${bed.foot} inches at the foot.`,
    );
  }

  if (wantsDesk) {
    const laptop = getDeskDepth("laptop");
    const desktop = getDeskDepth("desktop");
    const drafting = getDeskDepth("drafting");
    lines.push(
      `Desk depths: laptop ${laptop} inches, desktop ${desktop} inches, drafting ${drafting} inches.`,
    );
  }

  if (wantsRug) {
    lines.push(
      "Rug sizing: for living room, extend rug 18–24 inches beyond sofa; for dining, add 24 inches on each side of table for chair pullout; for bedroom, extend 18–24 inches on sides and foot of bed.",
    );
    const queenRug = getBedroomRugSize("queen");
    lines.push(
      `Example: queen bed bedroom rug typically ${queenRug.width}" x ${queenRug.length}".`,
    );
  }

  if (wantsDining) {
    const forSix = getDiningTableSize(6);
    if (forSix) {
      lines.push(
        `Dining table capacity (approx): 6 seats → about ${forSix.width}" × ${forSix.length}"; scale length ~12" per additional pair of seats; leave 36" circulation behind chairs.`,
      );
    }
  }

  if (wantsTv) {
    const for55 = getTvViewingDistance(55);
    lines.push(
      `TV viewing distance: roughly 1.5–2.5× diagonal (e.g. 55" screen → about ${for55.minInches}–${for55.maxInches} inches).`,
    );
  }

  if (lines.length === 0) return null;
  return `[DESIGN RULES]\n${lines.join(" ")}`;
}
