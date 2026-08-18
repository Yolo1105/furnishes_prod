import { logout } from "@/server/auth/service";
import { getOptionalCurrentSession } from "@/server/auth/session";
import { jsonOk } from "@/server/http";

export async function POST() {
  const session = await getOptionalCurrentSession();
  if (session) {
    await logout(session.sessionId, session.user.id);
  }
  return jsonOk({ ok: true });
}
