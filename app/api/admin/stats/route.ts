import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";

export const dynamic = "force-dynamic";

/**
 * Aggregate conversation/message stats (reference: chatbot_v3).
 * Allowed: signed-in user with role `admin` (verified in DB), or `Authorization: Bearer <ADMIN_STATS_SECRET>`.
 */
export async function GET(req: Request) {
  const secret = process.env.ADMIN_STATS_SECRET?.trim();
  const authHeader = req.headers.get("authorization");
  const bearerOk = !!secret && authHeader === `Bearer ${secret}`;

  let sessionAdmin = false;
  if (!bearerOk) {
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      sessionAdmin = user?.role === UserRole.admin;
    }
  }

  if (!bearerOk && !sessionAdmin) {
    return apiError(ErrorCodes.FORBIDDEN, "Forbidden", 403);
  }

  const [totalConvos, totalMessages, byConvo] = await Promise.all([
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.message.groupBy({
      by: ["conversationId"],
      _count: { _all: true },
    }),
  ]);

  const avgMessagesPerConversation =
    byConvo.length > 0
      ? byConvo.reduce((sum, g) => sum + g._count._all, 0) / byConvo.length
      : 0;

  return Response.json({
    totalConversations: totalConvos,
    totalMessages,
    avgMessagesPerConversation:
      Math.round(avgMessagesPerConversation * 100) / 100,
  });
}
