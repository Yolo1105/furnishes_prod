import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectViewer } from "@/lib/eva/projects/access";
import { buildProjectSummary } from "@/lib/eva/projects/build-project-summary";
import { PROJECT_COLLABORATION_COPY } from "@/lib/eva/projects/summary-constants";
import { renderProjectHandoffHtml } from "@/lib/eva/projects/handoff-html";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
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
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") ?? "html").toLowerCase();
    const summary = await buildProjectSummary(prisma, id);
    if (!summary) {
      return apiError(ErrorCodes.NOT_FOUND, "Not found", 404);
    }

    if (!summary.collaboration.handoffClearForExport) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        PROJECT_COLLABORATION_COPY.exportBlockedUntilReady,
        400,
      );
    }

    if (format === "html") {
      const html = renderProjectHandoffHtml(summary);
      const safeName =
        summary.title.replace(/[^\w\s-]/g, "").slice(0, 48) || "project";
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="furnishes-handoff-${safeName}.html"`,
        },
      });
    }

    if (format === "json") {
      return new Response(JSON.stringify(summary, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="furnishes-project-${id.slice(-8)}-summary.json"`,
        },
      });
    }

    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Use format=html or format=json",
      400,
    );
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_export");
  }
}
