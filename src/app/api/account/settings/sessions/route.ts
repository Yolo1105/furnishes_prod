import { listActiveSessions } from "@/server/auth/session";
import { jsonOk, requireApiSession } from "@/server/http";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const items = await listActiveSessions(session.user.id, session.sessionId);
  return jsonOk({ items });
}
