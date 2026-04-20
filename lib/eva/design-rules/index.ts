import {
  getWalkwayClearance,
  getMinBedClearance,
  getDeskDepth,
  type PathType,
  type DeskUsage,
} from "./clearances";
import {
  getBedroomRugSize,
  type SofaRugConfig,
  type BedSize,
} from "./rug-sizing";

export {
  getWalkwayClearance,
  getMinBedClearance,
  getDeskDepth,
} from "./clearances";
export { getRugSize, getDiningRugSize, getBedroomRugSize } from "./rug-sizing";
export {
  planLayout,
  parseRoomDimensions,
  parseLayoutOpenings,
} from "./layout-planner";
export type { PathType, DeskUsage, SofaRugConfig, BedSize };
export type {
  LayoutInput,
  LayoutOption,
  FurniturePlacement,
  Position,
  ParsedOpenings,
} from "./layout-planner";

const CLEARANCE_KEYWORDS = [
  "clearance",
  "clearances",
  "walkway",
  "space between",
  "how much space",
  "how much room",
  "distance between",
  "path",
  "circulation",
];
const BED_KEYWORDS = [
  "bed",
  "bedroom",
  "side of bed",
  "foot of bed",
  "around the bed",
];
const DESK_KEYWORDS = [
  "desk",
  "desk depth",
  "desk size",
  "laptop desk",
  "desktop desk",
  "drafting",
];
const RUG_KEYWORDS = [
  "rug",
  "rug size",
  "rug sizing",
  "sofa rug",
  "living room rug",
  "dining rug",
  "table rug",
  "bedroom rug",
  "under the table",
  "rug under",
];

/**
 * Simple keyword matcher: if the query mentions design rules, return a string
 * the LLM can include in its response. Used to inject [DESIGN RULE] into system prompt.
 */
export function lookupDesignRule(query: string): string | null {
  const lower = query.toLowerCase();
  const lines: string[] = [];

  if (CLEARANCE_KEYWORDS.some((k) => lower.includes(k))) {
    const typical = getWalkwayClearance("typical");
    const major = getWalkwayClearance("major");
    const between = getWalkwayClearance("between-furniture");
    lines.push(
      `Walkway clearances: typical path ${typical} inches, major path ${major} inches, between furniture ${between} inches.`,
    );
  }

  if (BED_KEYWORDS.some((k) => lower.includes(k))) {
    const bed = getMinBedClearance();
    lines.push(
      `Bed clearances: minimum ${bed.sides} inches on each side, ${bed.foot} inches at the foot.`,
    );
  }

  if (DESK_KEYWORDS.some((k) => lower.includes(k))) {
    const laptop = getDeskDepth("laptop");
    const desktop = getDeskDepth("desktop");
    const drafting = getDeskDepth("drafting");
    lines.push(
      `Desk depths: laptop ${laptop} inches, desktop ${desktop} inches, drafting ${drafting} inches.`,
    );
  }

  if (RUG_KEYWORDS.some((k) => lower.includes(k))) {
    lines.push(
      "Rug sizing: for living room, extend rug 18–24 inches beyond sofa; for dining, add 24 inches on each side of table for chair pullout; for bedroom, extend 18–24 inches on sides and foot of bed.",
    );
    const queenRug = getBedroomRugSize("queen");
    lines.push(
      `Example: queen bed bedroom rug typically ${queenRug.width}" x ${queenRug.length}".`,
    );
  }

  if (lines.length === 0) return null;
  return lines.join(" ");
}
