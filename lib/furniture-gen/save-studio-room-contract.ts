import type { ArrangeRoomShapeId } from "@/types/arrange-room";
import type { EnvPreset } from "@/components/eva-dashboard/account/image-gen/constants";

/** Single placed piece in a save request (normalized placement). */
export type SaveStudioRoomPlacementInput = {
  pieceId: string;
  orderIndex: number;
  position: {
    x: number;
    z: number;
    rotationY: number;
  };
};

/** Client → server: save arranged Eva Studio room into a project. */
export type SaveStudioRoomRequest = {
  projectId: string;
  roomShapeId: ArrangeRoomShapeId;
  widthM: number;
  depthM: number;
  environment: EnvPreset;
  placements: SaveStudioRoomPlacementInput[];
};

export type SaveStudioRoomResponse = {
  ok: true;
  saveId: string;
  projectId: string;
  placementCount: number;
};

export type SaveStudioRoomErrorResponse = {
  ok: false;
  error: string;
  code?: string;
};
