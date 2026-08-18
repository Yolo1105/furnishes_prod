import { revokeOtherSessions } from "@/server/auth/session";
import { jsonOk, requireApiSession } from "@/server/http";

export async function POST() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const count = await revokeOtherSessions(session.user.id, session.sessionId);
  return jsonOk({ revoked: count });
}
