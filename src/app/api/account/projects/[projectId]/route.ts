import {
  deleteProject,
  getProject,
  updateProject,
} from "@/server/projects/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { projectId } = await params;
  return fromServiceResult(await getProject(session.user.id, projectId));
}

export async function PUT(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { projectId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const record = (body ?? {}) as {
    name?: string;
    summary?: string;
    brief?: string;
    status?: string;
  };
  return fromServiceResult(
    await updateProject(session.user.id, projectId, record),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { projectId } = await params;
  return fromServiceResult(await deleteProject(session.user.id, projectId));
}
