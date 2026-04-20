import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectViewer } from "@/lib/eva/projects/access";
import { buildProjectSummary } from "@/lib/eva/projects/build-project-summary";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id } = await ctx.params;
    const access = await requireProjectViewer(id, userId);
    if (access.error || !access.access) {
      return apiError(
        access.status === 401 ? ErrorCodes.UNAUTHORIZED : ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const summary = await buildProjectSummary(prisma, id);
    if (!summary) {
      return apiError(ErrorCodes.NOT_FOUND, "Not found", 404);
    }
    return Response.json({ summary });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_summary");
  }
}
