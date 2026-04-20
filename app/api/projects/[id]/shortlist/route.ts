import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import { ProjectShortlistAddFromRecommendationSchema } from "@/lib/eva/projects/project-shortlist-schemas";
import {
  coverHueFromProductId,
  recommendationEstimatedPriceToCents,
  revalidateAccountShortlistSurfaces,
} from "@/lib/eva/projects/shortlist-helpers";
import { syncExecutionStateAfterContentChange } from "@/lib/eva/projects/execution-fingerprint-sync";
import { ProjectEventType } from "@prisma/client";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";
import { PROJECT_EVENT_AUDIT_LABEL } from "@/lib/eva/projects/summary-constants";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const json: unknown = await req.json().catch(() => null);
    const parsed = ProjectShortlistAddFromRecommendationSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid body", 400);
    }

    const { conversationId, recommendationItem, reasonSelected, status } =
      parsed.data;
    const item = recommendationItem;
    const productId = item.id;
    const priceCents = recommendationEstimatedPriceToCents(item.estimatedPrice);
    const coverHue = coverHueFromProductId(productId);
    const summaryText = item.summary?.trim() || null;
    const reason =
      (reasonSelected?.trim() || item.reasonWhyItFits).trim() || null;

    const statusVal = status ?? "considering";

    const existing = await prisma.shortlistItem.findFirst({
      where: {
        userId: userId!,
        projectId,
        productId,
      },
    });

    if (existing) {
      const updated = await prisma.shortlistItem.update({
        where: { id: existing.id },
        data: {
          productName: item.title,
          productCategory: item.category,
          priceCents,
          coverHue,
          sourceConversationId: conversationId,
          sourceRecommendationId: productId,
          summary: summaryText,
          reasonSelected: reason,
          rationale: item.reasonWhyItFits,
          status: statusVal,
        },
      });
      revalidateAccountShortlistSurfaces({
        projectId,
        shortlistItemId: updated.id,
      });
      await syncExecutionStateAfterContentChange(prisma, projectId);
      await recordProjectEvent(prisma, {
        projectId,
        actorUserId: userId!,
        eventType: ProjectEventType.shortlist_updated,
        targetType: "shortlist_item",
        targetId: updated.id,
        label: PROJECT_EVENT_AUDIT_LABEL.shortlistRowRefreshed(
          updated.productName,
        ),
        metadata: { productId: updated.productId, merged: true },
      });
      return Response.json({
        ok: true,
        merged: true,
        item: { id: updated.id },
      });
    }

    const row = await prisma.shortlistItem.create({
      data: {
        userId: userId!,
        projectId,
        productId,
        productName: item.title,
        productCategory: item.category,
        priceCents,
        coverHue,
        materials: [],
        rationale: item.reasonWhyItFits,
        sourceConversationId: conversationId,
        sourceRecommendationId: productId,
        summary: summaryText,
        reasonSelected: reason,
        status: statusVal,
      },
    });

    revalidateAccountShortlistSurfaces({
      projectId,
      shortlistItemId: row.id,
    });
    await syncExecutionStateAfterContentChange(prisma, projectId);
    await recordProjectEvent(prisma, {
      projectId,
      actorUserId: userId!,
      eventType: ProjectEventType.shortlist_item_added,
      targetType: "shortlist_item",
      targetId: row.id,
      label: PROJECT_EVENT_AUDIT_LABEL.shortlistItemAdded(row.productName),
      metadata: { productId: row.productId },
    });
    return Response.json({ ok: true, merged: false, item: { id: row.id } });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_shortlist_post");
  }
}
