import { z } from "zod";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import {
  transitionProjectWorkflow,
  type ManualWorkflowTransitionResult,
} from "@/lib/eva/design-workflow/transition";
import { WORKFLOW_STAGE_ZOD_ENUM } from "@/lib/eva/design-workflow/stages";
import type { WorkflowStageId } from "@/lib/eva/design-workflow/workflow-stage-ids";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  toStage: z.enum(WORKFLOW_STAGE_ZOD_ENUM),
  reason: z.string().max(500).optional(),
  /** Skip completion gates (advanced / support only). */
  force: z.boolean().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id } = await ctx.params;
    const access = await requireProjectEditor(id, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }
    const result: ManualWorkflowTransitionResult =
      await transitionProjectWorkflow(
        id,
        parsed.data.toStage as WorkflowStageId,
        parsed.data.reason,
        "manual",
        { force: parsed.data.force === true },
      );
    if (!result.ok) {
      return apiError(ErrorCodes.VALIDATION_ERROR, result.message, 409, {
        code: result.error,
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_workflow");
  }
}
