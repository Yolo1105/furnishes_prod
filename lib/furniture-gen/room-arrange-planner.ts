/**
 * Client-side linear placement along the back wall for Studio room preview.
 * Plain-language copy only — no provider / pipeline coupling.
 */

const MIN_ROOM_M = 0.5;
const MAX_ROOM_M = 80;
/** Minimum spacing between piece centers (matches scene layout budget). */
const MIN_CENTER_SPACING_M = 0.52;

export function clampRoomMeters(n: number): number {
  if (!Number.isFinite(n)) return MIN_ROOM_M;
  return Math.min(Math.max(n, MIN_ROOM_M), MAX_ROOM_M);
}

/** Parse user text like "4.0 m" or "4,5" → meters or error. */
export function parseRoomDimensionInput(
  raw: string,
): { ok: true; meters: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a width in meters." };
  }
  const m = trimmed.replace(/,/g, ".").match(/[\d.]+/);
  if (!m) {
    return { ok: false, error: "Use a number (meters)." };
  }
  const n = parseFloat(m[0]);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "Use a positive number." };
  }
  if (n < MIN_ROOM_M) {
    return {
      ok: false,
      error: `At least ${MIN_ROOM_M} m — this room would be too small to preview.`,
    };
  }
  if (n > MAX_ROOM_M) {
    return {
      ok: false,
      error: `At most ${MAX_ROOM_M} m for this preview.`,
    };
  }
  return { ok: true, meters: n };
}

export function validateRoomDimensions(
  widthRaw: string,
  depthRaw: string,
): import("@/types/arrange-room").RoomDimensionValidation {
  const w = parseRoomDimensionInput(widthRaw);
  const d = parseRoomDimensionInput(depthRaw);
  const widthError = w.ok ? undefined : w.error;
  const depthError = d.ok ? undefined : d.error;
  const widthM = w.ok ? w.meters : clampRoomMeters(MIN_ROOM_M);
  const depthM = d.ok ? d.meters : clampRoomMeters(MIN_ROOM_M);
  return {
    widthM,
    depthM,
    widthError,
    depthError,
    isValid: w.ok && d.ok,
  };
}

/**
 * Max pieces that fit along the width without crowding the layout.
 * Visual layout uses a separate spacing formula in `room-furniture-scene` —
 * keep capacity conservative so the strip rarely disagrees with the scene.
 */
export function maxPiecesForRoomWidth(widthM: number): number {
  const usable = widthM * 0.88;
  return Math.max(1, Math.floor(usable / MIN_CENTER_SPACING_M));
}

export function humanPlacementMessage(index: number, total: number): string {
  if (total <= 0) return "";
  if (total === 1) return "Placed along the back wall, centered.";
  if (index === 0) return "Placed near the left wall.";
  if (index === total - 1) return "Placed near the right wall.";
  return "Moved toward the center to avoid overlap.";
}

export const ROOM_FULL_MESSAGE =
  "This room can’t fit more pieces along the back wall. Try a wider room or remove a piece.";

export function canAddAnotherPiece(
  widthM: number,
  currentCount: number,
): boolean {
  return currentCount < maxPiecesForRoomWidth(widthM);
}
