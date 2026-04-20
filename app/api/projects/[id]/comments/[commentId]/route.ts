import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { getProjectAccess } from "@/lib/eva/projects/access";
import { appendProjectTimelineEvent } from "@/lib/eva/projects/timeline";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  resolved: z.boolean(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, commentId } = await ctx.params;

    const comment = await prisma.projectComment.findFirst({
      where: { id: commentId, projectId },
    });
    if (!comment) {
      return apiError(ErrorCodes.NOT_FOUND, "Comment not found", 404);
    }

    const access = await getProjectAccess(projectId, userId);
    if (!access) {
      return apiError(ErrorCodes.NOT_FOUND, "Not found", 404);
    }

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }

    const canResolve =
      comment.authorUserId === userId ||
      access.role === "owner" ||
      access.role === "editor";

    if (!canResolve) {
      return apiError(ErrorCodes.FORBIDDEN, "Forbidden", 403);
    }

    const updated = await prisma.projectComment.update({
      where: { id: commentId },
      data: {
        resolvedAt: parsed.data.resolved ? new Date() : null,
        resolverUserId: parsed.data.resolved ? userId : null,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (parsed.data.resolved) {
      await appendProjectTimelineEvent(prisma, {
        projectId,
        actorUserId: userId,
        kind: "comment_resolved",
        label: "Review comment resolved",
        metadata: { commentId },
      });
    }

    return Response.json({ comment: updated });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_comment_patch");
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, "Sign in required", 401);
    }
    const { id: projectId, commentId } = await ctx.params;

    const comment = await prisma.projectComment.findFirst({
      where: { id: commentId, projectId },
    });
    if (!comment) {
      return apiError(ErrorCodes.NOT_FOUND, "Comment not found", 404);
    }

    const access = await getProjectAccess(projectId, userId);
    if (!access) {
      return apiError(ErrorCodes.NOT_FOUND, "Not found", 404);
    }

    if (comment.authorUserId !== userId) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        "You can only delete your own comment",
        403,
      );
    }

    await prisma.projectComment.deleteMany({
      where: {
        OR: [{ id: commentId }, { parentId: commentId }],
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_comment_delete");
  }
}
