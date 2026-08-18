import { requirePlaygroundApiSession } from "@/server/canvas/playground-api-auth";
import { ensureStarterProject } from "@/server/canvas/playground-project-store";

export const dynamic = "force-dynamic";

export async function POST() {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  const project = await ensureStarterProject(session.user.id);
  return Response.json({ project });
}
