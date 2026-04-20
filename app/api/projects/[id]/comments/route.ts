import { z } from "zod";
import { ProjectCommentTargetType } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectViewer } from "@/lib/eva/projects/access";
import { appendProjectTimelineEvent } from "@/lib/eva/projects/timeline";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  targetType: z.nativeEnum(ProjectCommentTargetType),
  targetId: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
  parentId: z.string().cuid().nullable().optional(),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId } = await ctx.params;
    const access = await requireProjectViewer(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const url = new URL(req.url);
    const targetType = url.searchParams.get("targetType");
    const targetId = url.searchParams.get("targetId");

    const where: {
      projectId: string;
      targetType?: ProjectCommentTargetType;
      targetId?: string;
    } = { projectId };

    if (targetType && targetId) {
      const tt = targetType as ProjectCommentTargetType;
      if (!Object.values(ProjectCommentTargetType).includes(tt)) {
        return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid targetType", 400);
      }
      where.targetType = tt;
      where.targetId = targetId;
    }

    const rows = await prisma.projectComment.findMany({
      where: { ...where, parentId: null },
      orderBy: { createdAt: "asc" },
      take: 80,
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          take: 20,
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return Response.json({ comments: rows });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_comments_get");
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, "Sign in required", 401);
    }
    const authorId = userId;
    const { id: projectId } = await ctx.params;
    const access = await requireProjectViewer(projectId, authorId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const body = await req.json();
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }

    const d = parsed.data;
    const row = await prisma.projectComment.create({
      data: {
        projectId,
        authorUserId: authorId,
        targetType: d.targetType,
        targetId: d.targetId,
        body: d.body,
        parentId: d.parentId ?? undefined,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await appendProjectTimelineEvent(prisma, {
      projectId,
      actorUserId: authorId,
      kind: "comment_created",
      label: "Review comment added",
      metadata: {
        commentId: row.id,
        targetType: d.targetType,
        targetId: d.targetId,
      },
    });

    return Response.json({ comment: row });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_comments_post");
  }
}
