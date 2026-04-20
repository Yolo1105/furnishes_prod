import type { ArrangeRoomShapeId } from "@/types/arrange-room";
import type { EnvPreset } from "@/components/eva-dashboard/account/image-gen/constants";
import type { FilmRow } from "@/types/furniture-session";
import { ARRANGE_MSG } from "@/lib/furniture-gen/arrange-room-messages";
import { studioPlacementForIndex } from "@/lib/furniture-gen/studio-placement-math";
import type { SaveStudioRoomPlacementInput } from "@/lib/furniture-gen/save-studio-room-contract";

/**
 * Build API payload from Arrange state + catalog rows (requires `pieceId` on each placed row).
 */
export function buildSaveStudioRoomPayload(args: {
  projectId: string;
  roomShapeId: ArrangeRoomShapeId;
  widthM: number;
  depthM: number;
  environment: EnvPreset;
  placedKeysInOrder: string[];
  glbCatalog: (FilmRow & { glbUrl: string })[];
}):
  | {
      ok: true;
      body: import("@/lib/furniture-gen/save-studio-room-contract").SaveStudioRoomRequest;
    }
  | { ok: false; error: string } {
  const { placedKeysInOrder, glbCatalog, widthM } = args;
  const n = placedKeysInOrder.length;
  if (n === 0) {
    return { ok: false, error: ARRANGE_MSG.savePayloadNothingPlaced };
  }

  const placements: SaveStudioRoomPlacementInput[] = [];

  for (let i = 0; i < n; i++) {
    const key = placedKeysInOrder[i]!;
    const row = glbCatalog.find((r) => r.key === key);
    if (!row?.pieceId) {
      return { ok: false, error: ARRANGE_MSG.savePayloadMissingPieceId };
    }
    const pos = studioPlacementForIndex({
      widthM,
      placedCount: n,
      orderIndex: i,
    });
    placements.push({
      pieceId: row.pieceId,
      orderIndex: i,
      position: {
        x: pos.x,
        z: pos.z,
        rotationY: pos.rotationY,
      },
    });
  }

  return {
    ok: true,
    body: {
      projectId: args.projectId,
      roomShapeId: args.roomShapeId,
      widthM: args.widthM,
      depthM: args.depthM,
      environment: args.environment,
      placements,
    },
  };
}
