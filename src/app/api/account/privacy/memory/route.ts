import { setMemoryEnabled } from "@/server/account/privacy";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

export async function PUT(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const enabled = Boolean((body as { memoryEnabled?: boolean }).memoryEnabled);
  return fromServiceResult(await setMemoryEnabled(session.user.id, enabled));
}
