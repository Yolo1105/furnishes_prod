import { clearStudioMemory } from "@/server/account/privacy";
import { fromServiceResult, requireApiSession } from "@/server/http";

export async function POST() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const result = await clearStudioMemory(session.user.id);
  return fromServiceResult(result);
}
