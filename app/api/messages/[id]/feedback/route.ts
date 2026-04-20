import { z } from "zod";

import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  rating: z.enum(["positive", "negative", "implicit"]),
  comment: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: messageId } = await params;
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      String(parsed.error.flatten()),
      400,
    );
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true },
  });
  if (!message) {
    return apiError(ErrorCodes.NOT_FOUND, "Message not found", 404);
  }

  const access = await requireConversationAccess(message.conversationId, req);
  if (access.error) {
    return apiError(
      access.status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      access.error,
      access.status,
    );
  }

  const feedback = await prisma.messageFeedback.create({
    data: {
      messageId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? undefined,
    },
  });

  return Response.json(feedback);
}
