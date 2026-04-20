/** User-facing copy for Arrange — single source (hook + UI). */

export const ARRANGE_MSG = {
  pieceUnavailable: "That piece is no longer available.",
  fixDimensionsBeforePlace:
    "Fix the room width and depth before placing pieces.",
  saveInvalidDimensions: "Enter valid room dimensions before saving.",
  saveNeedPlaced: "Place at least one piece in the room to save.",
  saveToastFallback: "Room isn’t ready to save yet.",
  /** Shown under Save when the room is valid — real save uses the confirmation dialog. */
  saveProjectReadyNote:
    "Opens a confirmation — saves layout and placed pieces to your selected project.",
  savePayloadNothingPlaced: "Nothing placed in the room.",
  savePayloadMissingPieceId:
    "Each placed piece must be saved to your account first (finish generation). Remove legacy rows or regenerate.",
  saveOpenMissingPieceIds:
    "Each placed piece needs a saved studio record. Finish generation for every placed item, or remove pieces that are not fully saved.",
  saveChooseProject: "Choose a project to save into.",
  saveNetworkError: "Network error — your room was not saved. Try again.",
  saveUnexpectedResponse: "Unexpected response from server.",
  saveGenericFailure: "Could not save to your project. Try again.",
  savePieceIdBlockHint:
    "One or more placed items are missing a studio piece id. Regenerate or replace them.",
  /** Hero when the Arrange catalog is empty (no GLBs yet). */
  arrangeNoCatalogTitle: "Nothing to place yet",
  arrangeNoCatalogBody:
    "Generate a piece on the first tab. When the GLB is ready, come back and add it to the room.",
  /** Hero scrim when there are GLBs but nothing on the floor yet. */
  arrangeEmptyFloorTitle: "Nothing placed yet",
  arrangeEmptyFloorBody:
    "Use Auto-place all or tap a piece under Your pieces. Still unplaced pieces stay in the list until you add them.",
} as const;

export function formatSaveProjectSuccessToast(
  placedCount: number,
  projectTitle: string,
): string {
  return `Saved ${placedCount} ${placedCount === 1 ? "piece" : "pieces"} to “${projectTitle}”.`;
}
