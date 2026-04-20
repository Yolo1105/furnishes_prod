/**
 * Canonical view model for a saved Eva Studio room attached to a project.
 * Used by GET `/api/projects/[id]/saved-room` and project workspace UI.
 */

export type SavedRoomPieceView = {
  pieceId: string;
  title: string;
  orderIndex: number;
  position: { x: number; z: number; rotationY: number };
  /** Preferred preview; null if no durable/provider image */
  imageUrl: string | null;
  /** Preferred GLB for 3D; null if missing — UI must still show piece metadata */
  glbUrl: string | null;
  glbAvailable: boolean;
  imageAvailable: boolean;
};

/**
 * One revision of a room layout. Each successful "Save to my project" creates a **new** row
 * (append-only). The UI treats the latest revision as the default "current" layout unless
 * a specific `savedRoomId` is requested.
 */
export type ProjectSavedRoomView = {
  savedRoomId: string;
  projectId: string;
  roomShapeId: string;
  widthM: number;
  depthM: number;
  environment: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  /** 1-based index among all saves for this project (by creation order). */
  revisionIndex: number;
  totalRevisions: number;
  pieces: SavedRoomPieceView[];
};

export type ProjectSavedRoomApiOk = {
  ok: true;
  savedRoom: ProjectSavedRoomView | null;
};

export type ProjectSavedRoomApiError = {
  ok: false;
  error: string;
  code?: string;
};

export type ProjectSavedRoomApiResponse =
  | ProjectSavedRoomApiOk
  | ProjectSavedRoomApiError;
