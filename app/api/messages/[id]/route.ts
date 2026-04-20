import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: messageId } = await params;
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      content: true,
      role: true,
      createdAt: true,
      conversationId: true,
    },
  });
  if (!message) return apiError(ErrorCodes.NOT_FOUND, "Message not found", 404);
  const { error, status } = await requireConversationAccess(
    message.conversationId,
    req,
  );
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  return Response.json({
    id: message.id,
    content: message.content,
    role: message.role,
    createdAt: message.createdAt,
  });
}
