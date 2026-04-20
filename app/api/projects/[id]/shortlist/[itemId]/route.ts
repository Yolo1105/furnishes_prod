import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import { ProjectShortlistPatchSchema } from "@/lib/eva/projects/project-shortlist-schemas";
import { revalidateAccountShortlistSurfaces } from "@/lib/eva/projects/shortlist-helpers";
import { syncExecutionStateAfterContentChange } from "@/lib/eva/projects/execution-fingerprint-sync";
import { ProjectEventType } from "@prisma/client";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";
import { PROJECT_EVENT_AUDIT_LABEL } from "@/lib/eva/projects/summary-constants";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, itemId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const json: unknown = await req.json().catch(() => null);
    const parsed = ProjectShortlistPatchSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid body", 400);
    }

    const row = await prisma.shortlistItem.findFirst({
      where: { id: itemId, userId: userId!, projectId },
    });
    if (!row) {
      return apiError(ErrorCodes.NOT_FOUND, "Shortlist item not found", 404);
    }

    const data = parsed.data;
    const prevExternal = row.externalLifecycle;
    const updated = await prisma.shortlistItem.update({
      where: { id: itemId },
      data: {
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.reasonSelected !== undefined
          ? { reasonSelected: data.reasonSelected }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.externalLifecycle !== undefined
          ? { externalLifecycle: data.externalLifecycle }
          : {}),
      },
    });

    if (
      data.externalLifecycle !== undefined &&
      data.externalLifecycle !== prevExternal
    ) {
      const ev =
        data.externalLifecycle === "replaced" ||
        data.externalLifecycle === "unavailable"
          ? ProjectEventType.substitution_made
          : ProjectEventType.item_status_changed;
      await recordProjectEvent(prisma, {
        projectId,
        actorUserId: userId!,
        eventType: ev,
        targetType: "shortlist_item",
        targetId: itemId,
        label: `${updated.productName}: ${prevExternal} → ${data.externalLifecycle}`,
        metadata: {
          previous: prevExternal,
          next: data.externalLifecycle,
        },
      });
    }

    revalidateAccountShortlistSurfaces({
      projectId,
      shortlistItemId: itemId,
    });
    await syncExecutionStateAfterContentChange(prisma, projectId);
    return Response.json({
      ok: true,
      item: {
        id: updated.id,
        notes: updated.notes,
        reasonSelected: updated.reasonSelected,
        status: updated.status,
        externalLifecycle: updated.externalLifecycle,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_shortlist_patch");
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, itemId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const existing = await prisma.shortlistItem.findFirst({
      where: { id: itemId, userId: userId!, projectId },
    });
    if (!existing) {
      return apiError(ErrorCodes.NOT_FOUND, "Shortlist item not found", 404);
    }

    await recordProjectEvent(prisma, {
      projectId,
      actorUserId: userId!,
      eventType: ProjectEventType.shortlist_item_removed,
      targetType: "shortlist_item",
      targetId: itemId,
      label: PROJECT_EVENT_AUDIT_LABEL.shortlistItemRemoved(
        existing.productName,
      ),
      metadata: { productId: existing.productId },
    });

    await prisma.shortlistItem.delete({
      where: { id: itemId },
    });

    revalidateAccountShortlistSurfaces({
      projectId,
      shortlistItemId: itemId,
    });
    await syncExecutionStateAfterContentChange(prisma, projectId);
    return Response.json({ ok: true });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_shortlist_delete");
  }
}
