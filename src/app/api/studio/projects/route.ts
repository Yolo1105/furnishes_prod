import { z } from "zod";
import { requirePlaygroundApiSession } from "@/server/canvas/playground-api-auth";
import {
  createProject,
  listProjects,
} from "@/server/canvas/playground-project-store";

export const dynamic = "force-dynamic";

const CreateBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export async function GET() {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  const projects = await listProjects(session.user.id);
  return Response.json({ projects });
}

export async function POST(req: Request) {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const project = await createProject(session.user.id, parsed.data.name);
  return Response.json({ project });
}
