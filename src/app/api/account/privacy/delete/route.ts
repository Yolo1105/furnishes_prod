import { deleteAccount } from "@/server/account/privacy";
import { clearSessionCookie } from "@/server/auth/session";
import { fromServiceResult, requireApiSession } from "@/server/http";

export async function POST() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const result = await deleteAccount(session.user.id);
  await clearSessionCookie();
  return fromServiceResult(result);
}
