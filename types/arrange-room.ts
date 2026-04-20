/**
 * Studio Arrange tab — room planning workflow (client-only; not persisted).
 */

/** Room shape presets match `ARRANGE_SHAPE_PRESETS` in image-gen constants. */
export type ArrangeRoomShapeId = "square" | "wide" | "tall" | "l";

/** 3D canvas behaviour in `RoomFurnitureScene`. */
export type ArrangeCameraMode = "orbit" | "topDown";

export type ArrangeRoomWarning = {
  id: string;
  message: string;
};

export type RoomDimensionValidation = {
  widthM: number;
  depthM: number;
  widthError?: string;
  depthError?: string;
  isValid: boolean;
};

/** Save CTA gating (Phase 3 — no API call). */
export type ArrangeSaveReadiness = {
  canSave: boolean;
  reasonIfBlocked: string | null;
};
