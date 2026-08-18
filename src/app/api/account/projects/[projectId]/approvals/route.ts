import { setProjectApproval } from "@/server/projects/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { projectId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const status = (body as { status?: string }).status;
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return jsonError(400, "validation", "Invalid approval status.");
  }
  const note = (body as { note?: string }).note;
  return fromServiceResult(
    await setProjectApproval(session.user.id, projectId, status, note),
  );
}
