import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/auth";
import { apiError } from "@/lib/api/error";
import { prisma } from "@/lib/eva/db";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import {
  positionsMatchStudioLayout,
  studioPlacementForIndex,
} from "@/lib/furniture-gen/studio-placement-math";
import {
  SaveStudioRoomBodySchema,
  type SaveStudioRoomBody,
} from "@/lib/furniture-gen/save-studio-room-schema";
import type { SaveStudioRoomResponse } from "@/lib/furniture-gen/save-studio-room-contract";

/**
 * POST /api/furniture-3d/save-room
 * Persists the current Eva Studio arranged room into `ProjectStudioRoomSave` + placements.
 */
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    const u = await requireUser();
    userId = u.userId;
  } catch (e) {
    return apiError(e);
  }

  let body: SaveStudioRoomBody;
  try {
    body = SaveStudioRoomBodySchema.parse(await req.json());
  } catch (e) {
    return apiError(e);
  }

  const access = await requireProjectEditor(body.projectId, userId);
  if (access.error || !access.access) {
    return NextResponse.json(
      { ok: false, error: access.error ?? "Not found", code: "PROJECT" },
      { status: access.status },
    );
  }

  const sorted = [...body.placements].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i]!.orderIndex !== i) {
      return NextResponse.json(
        {
          ok: false,
          error: "Placements must use contiguous orderIndex starting at 0.",
          code: "PLACEMENT_ORDER",
        },
        { status: 400 },
      );
    }
  }

  const n = sorted.length;
  const pieceIds = [...new Set(sorted.map((p) => p.pieceId))];
  if (pieceIds.length !== sorted.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Duplicate piece in placement list.",
        code: "DUPLICATE_PIECE",
      },
      { status: 400 },
    );
  }

  const pieces = await prisma.furnitureStudioPiece.findMany({
    where: {
      id: { in: pieceIds },
      userId,
      status: "completed",
    },
    select: {
      id: true,
      storedGlbUrl: true,
      providerGlbUrl: true,
    },
  });

  if (pieces.length !== pieceIds.length) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "One or more pieces are missing, not yours, or not ready. Refresh and try again.",
        code: "PIECE_OWNERSHIP",
      },
      { status: 400 },
    );
  }

  for (const p of pieces) {
    const glb = p.storedGlbUrl ?? p.providerGlbUrl;
    if (!glb?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A placed piece has no GLB URL. Regenerate or pick another piece.",
          code: "MISSING_GLB",
        },
        { status: 400 },
      );
    }
  }

  for (const row of sorted) {
    if (
      !positionsMatchStudioLayout(body.widthM, n, {
        orderIndex: row.orderIndex,
        x: row.position.x,
        z: row.position.z,
        rotationY: row.position.rotationY,
      })
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Placement layout does not match the room. Save again from Arrange.",
          code: "LAYOUT_MISMATCH",
        },
        { status: 400 },
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const save = await tx.projectStudioRoomSave.create({
        data: {
          projectId: body.projectId,
          roomShapeId: body.roomShapeId,
          widthM: body.widthM,
          depthM: body.depthM,
          environment: body.environment,
          source: "eva_studio",
        },
      });

      for (let i = 0; i < sorted.length; i++) {
        const row = sorted[i]!;
        const pos = studioPlacementForIndex({
          widthM: body.widthM,
          placedCount: n,
          orderIndex: i,
        });
        await tx.projectStudioPlacement.create({
          data: {
            saveId: save.id,
            furnitureStudioPieceId: row.pieceId,
            orderIndex: i,
            positionX: pos.x,
            positionZ: pos.z,
            rotationY: pos.rotationY,
          },
        });
      }

      return save;
    });

    const payload: SaveStudioRoomResponse = {
      ok: true,
      saveId: result.id,
      projectId: body.projectId,
      placementCount: sorted.length,
    };
    return NextResponse.json(payload);
  } catch (e) {
    return apiError(e);
  }
}
