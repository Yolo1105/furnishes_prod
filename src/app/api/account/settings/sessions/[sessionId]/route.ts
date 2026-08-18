import { revokeSession } from "@/server/auth/session";
import { jsonError, jsonOk, requireApiSession } from "@/server/http";
import { prisma } from "@/server/db";

type Params = { params: Promise<{ sessionId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { sessionId } = await params;
  if (sessionId === session.sessionId) {
    return jsonError(
      400,
      "validation",
      "Use sign out for the current session.",
    );
  }
  const target = await prisma.session.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });
  if (!target) {
    return jsonError(404, "not_found", "Session not found.");
  }
  await revokeSession(sessionId, { userId: session.user.id });
  return jsonOk({ revoked: true });
}
