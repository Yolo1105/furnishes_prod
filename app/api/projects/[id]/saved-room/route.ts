import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { prisma } from "@/lib/eva/db";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import { buildSavedRoomView } from "@/lib/eva/projects/map-project-saved-room";
import type { ProjectSavedRoomApiResponse } from "@/lib/eva/projects/saved-room-read-model";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/saved-room
 * Query: `savedRoom` | `savedRoomId` — optional; defaults to latest save for the project.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const url = new URL(req.url);
    const requestedId =
      url.searchParams.get("savedRoomId")?.trim() ??
      url.searchParams.get("savedRoom")?.trim() ??
      null;

    const orderedSaves = await prisma.projectStudioRoomSave.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const orderedSaveIds = orderedSaves.map((r) => r.id);

    if (orderedSaveIds.length === 0) {
      const body: ProjectSavedRoomApiResponse = { ok: true, savedRoom: null };
      return Response.json(body);
    }

    let targetSaveId: string;
    if (requestedId) {
      if (!orderedSaveIds.includes(requestedId)) {
        return apiError(
          ErrorCodes.NOT_FOUND,
          "Saved room not found for this project",
          404,
        );
      }
      targetSaveId = requestedId;
    } else {
      targetSaveId = orderedSaveIds[orderedSaveIds.length - 1]!;
    }

    const save = await prisma.projectStudioRoomSave.findFirst({
      where: { id: targetSaveId, projectId },
      include: {
        placements: {
          orderBy: { orderIndex: "asc" },
          include: {
            piece: {
              select: {
                id: true,
                title: true,
                storedImageUrl: true,
                providerImageUrl: true,
                storedGlbUrl: true,
                providerGlbUrl: true,
              },
            },
          },
        },
      },
    });

    if (!save) {
      const body: ProjectSavedRoomApiResponse = { ok: true, savedRoom: null };
      return Response.json(body);
    }

    const view = buildSavedRoomView({
      save: {
        id: save.id,
        projectId: save.projectId,
        roomShapeId: save.roomShapeId,
        widthM: save.widthM,
        depthM: save.depthM,
        environment: save.environment,
        source: save.source,
        createdAt: save.createdAt,
        updatedAt: save.updatedAt,
        placements: save.placements.map((pl) => ({
          orderIndex: pl.orderIndex,
          positionX: pl.positionX,
          positionZ: pl.positionZ,
          rotationY: pl.rotationY,
          piece: pl.piece,
        })),
      },
      orderedSaveIds,
    });

    const body: ProjectSavedRoomApiResponse = { ok: true, savedRoom: view };
    return Response.json(body);
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_saved_room_get");
  }
}
