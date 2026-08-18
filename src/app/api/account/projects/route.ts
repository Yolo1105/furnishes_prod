import { createProject, listProjects } from "@/server/projects/service";
import {
  fromServiceResult,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/server/http";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  return jsonOk({ items: await listProjects(session.user.id) });
}

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const record = (body ?? {}) as { name?: string; summary?: string };
  return fromServiceResult(
    await createProject(session.user.id, {
      name: record.name ?? "",
      ...(record.summary !== undefined ? { summary: record.summary } : {}),
    }),
  );
}
