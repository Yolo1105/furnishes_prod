import { prisma } from "@/lib/eva/db";
import {
  requireConversationAccess,
  getSessionUserId,
} from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { normalizeAssistantId } from "@/lib/eva/assistants/catalog";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchBodySchema = z
  .object({
    isSaved: z.boolean().optional(),
    assistantId: z.string().min(1).optional(),
    /** Attach or move conversation to a project you own; `null` detaches. */
    projectId: z.string().nullable().optional(),
  })
  .refine(
    (d) =>
      d.isSaved !== undefined ||
      d.assistantId !== undefined ||
      d.projectId !== undefined,
    {
      message: "Provide isSaved, assistantId, and/or projectId",
    },
  );

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return apiError(ErrorCodes.NOT_FOUND, "Conversation not found", 404);
  }

  return Response.json(conversation);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid JSON body", 400);
  }
  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      String(parsed.error.flatten()),
      400,
    );
  }
  const {
    isSaved,
    assistantId: patchAssistantId,
    projectId: patchProjectId,
  } = parsed.data;
  const userId = await getSessionUserId();
  if (patchProjectId !== undefined && patchProjectId !== null && !userId) {
    return apiError(ErrorCodes.FORBIDDEN, "Sign in to attach a project", 401);
  }
  if (patchProjectId !== undefined && patchProjectId !== null && userId) {
    const proj = await prisma.project.findFirst({
      where: { id: patchProjectId, userId },
    });
    if (!proj) {
      return apiError(ErrorCodes.NOT_FOUND, "Project not found", 404);
    }
  }
  const now = new Date();
  const data: {
    isSaved?: boolean;
    savedAt?: Date | null;
    assistantId?: string;
    projectId?: string | null;
  } = {};
  if (isSaved !== undefined) {
    data.isSaved = isSaved;
    data.savedAt = isSaved ? now : null;
  }
  if (patchAssistantId !== undefined) {
    data.assistantId = normalizeAssistantId(patchAssistantId);
  }
  if (patchProjectId !== undefined) {
    data.projectId = patchProjectId;
  }
  const updated = await prisma.conversation.update({
    where: { id },
    data,
    select: {
      id: true,
      isSaved: true,
      savedAt: true,
      assistantId: true,
      projectId: true,
    },
  });
  return Response.json({
    id: updated.id,
    isSaved: updated.isSaved,
    savedAt: updated.savedAt?.toISOString() ?? null,
    assistantId: updated.assistantId,
    projectId: updated.projectId,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });
  if (!conversation) {
    return apiError(ErrorCodes.NOT_FOUND, "Conversation not found", 404);
  }
  await prisma.conversation.delete({
    where: { id },
  });
  return Response.json({ ok: true });
}
