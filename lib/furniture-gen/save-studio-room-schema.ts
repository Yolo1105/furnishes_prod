import { z } from "zod";
import {
  ARRANGE_SHAPE_PRESETS,
  ENV_PRESET_ORDER,
  type EnvPreset,
} from "@/components/eva-dashboard/account/image-gen/constants";
import type { ArrangeRoomShapeId } from "@/types/arrange-room";

const roomShapeIds = ARRANGE_SHAPE_PRESETS.map((p) => p.id) as [
  ArrangeRoomShapeId,
  ...ArrangeRoomShapeId[],
];

const RoomShapeEnum = z.enum(roomShapeIds);

const EnvEnum = z.enum(
  ENV_PRESET_ORDER as unknown as [EnvPreset, ...EnvPreset[]],
);

const PlacementSchema = z.object({
  pieceId: z.string().cuid(),
  orderIndex: z.number().int().min(0).max(64),
  position: z.object({
    x: z.number().finite(),
    z: z.number().finite(),
    rotationY: z.number().finite(),
  }),
});

export const SaveStudioRoomBodySchema = z.object({
  projectId: z.string().cuid(),
  roomShapeId: RoomShapeEnum,
  widthM: z.number().positive().max(80),
  depthM: z.number().positive().max(80),
  environment: EnvEnum,
  placements: z.array(PlacementSchema).min(1).max(32),
});

export type SaveStudioRoomBody = z.infer<typeof SaveStudioRoomBodySchema>;
