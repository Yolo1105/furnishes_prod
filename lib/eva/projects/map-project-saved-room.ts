import type {
  ProjectSavedRoomView,
  SavedRoomPieceView,
} from "@/lib/eva/projects/saved-room-read-model";
import type { RoomPlacement } from "@/types/room";

type PieceRow = {
  id: string;
  title: string;
  storedImageUrl: string | null;
  providerImageUrl: string | null;
  storedGlbUrl: string | null;
  providerGlbUrl: string | null;
};

type PlacementRow = {
  orderIndex: number;
  positionX: number;
  positionZ: number;
  rotationY: number;
  piece: PieceRow;
};

export type SaveRowInput = {
  id: string;
  projectId: string;
  roomShapeId: string;
  widthM: number;
  depthM: number;
  environment: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  placements: PlacementRow[];
};

/** Map DB piece URLs to view fields with resilient fallbacks. */
export function mapPieceUrls(
  piece: PieceRow,
): Pick<
  SavedRoomPieceView,
  "imageUrl" | "glbUrl" | "glbAvailable" | "imageAvailable"
> {
  const img = (piece.storedImageUrl ?? piece.providerImageUrl)?.trim() || null;
  const glb = (piece.storedGlbUrl ?? piece.providerGlbUrl)?.trim() || null;
  return {
    imageUrl: img,
    glbUrl: glb,
    glbAvailable: Boolean(glb),
    imageAvailable: Boolean(img),
  };
}

export function mapPlacementToPieceView(row: PlacementRow): SavedRoomPieceView {
  const urls = mapPieceUrls(row.piece);
  return {
    pieceId: row.piece.id,
    title: row.piece.title,
    orderIndex: row.orderIndex,
    position: {
      x: row.positionX,
      z: row.positionZ,
      rotationY: row.rotationY,
    },
    ...urls,
  };
}

export function buildSavedRoomView(args: {
  save: SaveRowInput;
  orderedSaveIds: string[];
}): ProjectSavedRoomView {
  const { save, orderedSaveIds } = args;
  const revisionIndex = orderedSaveIds.indexOf(save.id) + 1;
  const pieces = [...save.placements]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(mapPlacementToPieceView);

  return {
    savedRoomId: save.id,
    projectId: save.projectId,
    roomShapeId: save.roomShapeId,
    widthM: save.widthM,
    depthM: save.depthM,
    environment: save.environment,
    source: save.source,
    createdAt: save.createdAt.toISOString(),
    updatedAt: save.updatedAt.toISOString(),
    revisionIndex: revisionIndex > 0 ? revisionIndex : 1,
    totalRevisions: orderedSaveIds.length,
    pieces,
  };
}

/** Placements with valid GLBs for `RoomFurnitureScene` (order preserved). */
export function placementsForRoomScene(
  pieces: SavedRoomPieceView[],
): RoomPlacement[] {
  return [...pieces]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((p) => p.glbUrl)
    .map((p) => ({ key: p.pieceId, glbUrl: p.glbUrl! }));
}
