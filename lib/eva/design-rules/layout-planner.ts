import { getWalkwayClearance, getMinBedClearance } from "./clearances";

export interface Position {
  wall: "north" | "south" | "east" | "west";
  offsetInches: number; // from the "start" of the wall (e.g. west end of north wall)
  widthInches?: number;
  depthInches?: number;
}

export interface LayoutInput {
  roomWidthInches: number;
  roomLengthInches: number;
  doors: Position[];
  windows: Position[];
  closets: Position[];
}

export interface FurniturePlacement {
  piece: "bed" | "desk" | "sofa" | "dining_table";
  position: Position;
  rationale: string;
}

export interface LayoutOption {
  placements: FurniturePlacement[];
  rationale: string;
  score: number;
}

const WALKWAY = getWalkwayClearance("typical");
const BED_CLEARANCE = getMinBedClearance();

/**
 * Check if a rectangular placement (position + width/depth) overlaps or blocks
 * doors/windows/closets or violates clearances.
 */
function isValidPlacement(
  pos: Position,
  widthInches: number,
  depthInches: number,
  input: LayoutInput,
): boolean {
  const obstacles = [...input.doors, ...input.windows, ...input.closets];
  for (const ob of obstacles) {
    const obStart = ob.offsetInches;
    const obEnd = obStart + (ob.widthInches ?? 24);
    const posStart = pos.offsetInches;
    const posEnd =
      pos.offsetInches +
      (pos.wall === "north" || pos.wall === "south"
        ? widthInches
        : depthInches);
    if (pos.wall === ob.wall && !(posEnd <= obStart || posStart >= obEnd))
      return false;
  }
  const margin = WALKWAY;
  if (pos.wall === "north" || pos.wall === "south") {
    if (
      pos.offsetInches < margin ||
      pos.offsetInches + widthInches > input.roomWidthInches - margin
    )
      return false;
  } else {
    if (
      pos.offsetInches < margin ||
      pos.offsetInches + depthInches > input.roomLengthInches - margin
    )
      return false;
  }
  return true;
}

/**
 * Score a placement: natural light (near window = bonus), traffic flow (not blocking door = bonus).
 */
function scorePlacement(
  placement: FurniturePlacement,
  input: LayoutInput,
): number {
  let score = 50;
  const pos = placement.position;
  const hasWindowOnWall = input.windows.some((w) => w.wall === pos.wall);
  if (hasWindowOnWall && placement.piece === "desk") score += 20;
  if (hasWindowOnWall && placement.piece === "bed") score += 10;
  const blocksDoor = input.doors.some((d) => d.wall === pos.wall);
  if (!blocksDoor) score += 15;
  return score;
}

/**
 * Compute 2-3 feasible layout options for bedroom (bed + optional desk).
 * Room dimensions in inches; doors/windows/closets define obstacles.
 */
export function planLayout(input: LayoutInput): LayoutOption[] {
  const options: LayoutOption[] = [];
  const { roomWidthInches, roomLengthInches } = input;

  const bedWidth = 60;
  const bedLength = 80;
  const deskDepth = 24;
  const deskWidth = 48;

  const walls: Array<"north" | "south" | "east" | "west"> = [
    "north",
    "south",
    "east",
    "west",
  ];
  const bedPlacements: FurniturePlacement[] = [];

  for (const wall of walls) {
    const maxOffset =
      (wall === "north" || wall === "south"
        ? roomWidthInches
        : roomLengthInches) - bedLength;
    for (
      let offset = BED_CLEARANCE.sides;
      offset <= maxOffset - BED_CLEARANCE.sides;
      offset += 12
    ) {
      const pos: Position = {
        wall,
        offsetInches: offset,
        widthInches: bedLength,
        depthInches: bedWidth,
      };
      if (isValidPlacement(pos, bedLength, bedWidth, input)) {
        const placement: FurniturePlacement = {
          piece: "bed",
          position: pos,
          rationale: `Bed on ${wall} wall with ${BED_CLEARANCE.sides}" side clearances`,
        };
        bedPlacements.push(placement);
      }
    }
  }

  for (let i = 0; i < Math.min(3, bedPlacements.length); i++) {
    const bed = bedPlacements[i];
    const deskCandidates: FurniturePlacement[] = [];
    for (const wall of walls) {
      const len =
        wall === "north" || wall === "south"
          ? roomWidthInches
          : roomLengthInches;
      for (
        let offset = WALKWAY;
        offset <= len - deskWidth - WALKWAY;
        offset += 12
      ) {
        const pos: Position = {
          wall,
          offsetInches: offset,
          widthInches: deskWidth,
          depthInches: deskDepth,
        };
        if (isValidPlacement(pos, deskWidth, deskDepth, input)) {
          deskCandidates.push({
            piece: "desk",
            position: pos,
            rationale: `Desk on ${wall} wall with walkway clearance`,
          });
        }
      }
    }
    const bestDesk = deskCandidates.length
      ? deskCandidates.sort(
          (a, b) => scorePlacement(b, input) - scorePlacement(a, input),
        )[0]
      : null;
    const placements = [bed, ...(bestDesk ? [bestDesk] : [])];
    const score =
      placements.reduce((s, p) => s + scorePlacement(p, input), 0) /
      placements.length;
    options.push({
      placements,
      rationale: `Option ${i + 1}: bed on ${bed.position.wall} wall${bestDesk ? `, desk on ${bestDesk.position.wall} wall` : ""}. ${bed.rationale}.`,
      score,
    });
  }

  return options.sort((a, b) => b.score - a.score).slice(0, 3);
}

export type ParsedOpenings = {
  doors: Position[];
  windows: Position[];
  closets: Position[];
};

const DEFAULT_OFFSET_INCHES = 24;

function parseWall(str: string): "north" | "south" | "east" | "west" | null {
  const m = str.toLowerCase().match(/\b(north|south|east|west)\b/);
  if (!m) return null;
  return m[1] as "north" | "south" | "east" | "west";
}

/**
 * Parse door/window/closet positions from message text (e.g. "door on north wall", "window on the east side").
 * Returns arrays of positions; uses default offset when only wall is mentioned.
 */
export function parseLayoutOpenings(text: string): ParsedOpenings {
  const lower = text.toLowerCase();
  const doors: Position[] = [];
  const windows: Position[] = [];
  const closets: Position[] = [];

  // Door: "door on X wall", "entrance on X", "door on the X side"
  const doorRegex =
    /\b(door|entrance|entry)\s+(?:on\s+(?:the\s+)?)?(north|south|east|west)(?:\s+wall|\s+side)?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = doorRegex.exec(lower)) !== null) {
    const wall = parseWall(match[0]);
    if (wall) doors.push({ wall, offsetInches: DEFAULT_OFFSET_INCHES });
  }

  // Window: "window on X wall", "window on the X side"
  const windowRegex =
    /\bwindow(s)?\s+(?:on\s+(?:the\s+)?)?(north|south|east|west)(?:\s+wall|\s+side)?\b/gi;
  while ((match = windowRegex.exec(lower)) !== null) {
    const wall = parseWall(match[0]);
    if (wall) windows.push({ wall, offsetInches: DEFAULT_OFFSET_INCHES });
  }

  // Closet: "closet on X wall", "closet on the X side"
  const closetRegex =
    /\bcloset(s)?\s+(?:on\s+(?:the\s+)?)?(north|south|east|west)(?:\s+wall|\s+side)?\b/gi;
  while ((match = closetRegex.exec(lower)) !== null) {
    const wall = parseWall(match[0]);
    if (wall) closets.push({ wall, offsetInches: DEFAULT_OFFSET_INCHES });
  }

  return { doors, windows, closets };
}

/**
 * Parse room dimensions from text (e.g. "12x14 feet" or "12 ft by 14 ft").
 * Returns dimensions in inches or null.
 */
export function parseRoomDimensions(
  text: string,
): { widthInches: number; lengthInches: number } | null {
  const lower = text.toLowerCase();
  const match = lower.match(/(\d+)\s*[x×]\s*(\d+)\s*(ft|feet|')?/);
  if (match) {
    const w = parseInt(match[1], 10);
    const l = parseInt(match[2], 10);
    if (w > 0 && l > 0) return { widthInches: w * 12, lengthInches: l * 12 };
  }
  const byMatch = lower.match(
    /(\d+)\s*(ft|feet|')\s*by\s*(\d+)\s*(ft|feet|')?/,
  );
  if (byMatch) {
    const w = parseInt(byMatch[1], 10);
    const l = parseInt(byMatch[3], 10);
    if (w > 0 && l > 0) return { widthInches: w * 12, lengthInches: l * 12 };
  }
  return null;
}
