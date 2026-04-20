import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectViewer } from "@/lib/eva/projects/access";
import { listProjectArtifacts } from "@/lib/eva/projects/list-project-artifacts";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId } = await ctx.params;
    const access = await requireProjectViewer(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        access.status === 401 ? ErrorCodes.UNAUTHORIZED : ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const files = await listProjectArtifacts(prisma, projectId);
    return Response.json(files);
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_files");
  }
}
