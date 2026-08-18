import { addProjectComment } from "@/server/projects/service";
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
  const commentBody = (body as { body?: string }).body ?? "";
  return fromServiceResult(
    await addProjectComment(session.user.id, projectId, commentBody),
  );
}
