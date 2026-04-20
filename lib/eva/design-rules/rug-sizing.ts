/**
 * Rug sizing rules (inches). Add 24 inches per side for chair pullout at dining.
 */

export type SofaRugConfig = "all-legs-on" | "front-legs-on" | "no-legs";

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
    length: Math.round((sofaWidthInches + extension * 2) * 1.4), // typical living room aspect
  };
}

/**
 * Dining rug: add 24 inches on each side of table for chair pullout.
 */
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

export type BedSize = "twin" | "queen" | "king";

const BED_DIMENSIONS: Record<BedSize, { width: number; length: number }> = {
  twin: { width: 38, length: 75 },
  queen: { width: 60, length: 80 },
  king: { width: 76, length: 80 },
};

/**
 * Bedroom rug placement: extend 18–24 inches on sides and foot for comfort.
 */
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
