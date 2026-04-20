/**
 * Strip layout in `RoomFurnitureScene` uses ~1.5 m spacing; treat each slot as
 * needing this much width so overflow pieces stay visibly "unplaced" in the UI.
 */
export const ROOM_PLACEMENT_SLOT_M = 1.15;

export function maxPlacedPiecesForWidth(widthM: number): number {
  const w = Math.max(0.5, widthM);
  return Math.max(1, Math.floor(w / ROOM_PLACEMENT_SLOT_M));
}

/** Split desired placement order into what fits in the scene vs overflow. */
export function splitPlacedKeysForRoom(
  desiredKeyOrder: string[],
  widthM: number,
): { inSceneKeys: string[]; overflowKeys: string[] } {
  const cap = maxPlacedPiecesForWidth(widthM);
  return {
    inSceneKeys: desiredKeyOrder.slice(0, cap),
    overflowKeys: desiredKeyOrder.slice(cap),
  };
}
