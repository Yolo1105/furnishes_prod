import { z } from "zod";
import { MemberRole, ProjectMemberStatus } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireCanonicalProjectOwner } from "@/lib/eva/projects/access";
import { appendProjectTimelineEvent } from "@/lib/eva/projects/timeline";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, memberId } = await ctx.params;
    const access = await requireCanonicalProjectOwner(projectId, userId);
    if (access.error || !access.project) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId, status: ProjectMemberStatus.active },
    });
    if (!member) {
      return apiError(ErrorCodes.NOT_FOUND, "Member not found", 404);
    }

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }

    const newRole =
      parsed.data.role === "editor" ? MemberRole.editor : MemberRole.viewer;

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    await appendProjectTimelineEvent(prisma, {
      projectId,
      actorUserId: userId,
      kind: "role_changed",
      label: `Collaborator role updated to ${newRole}`,
      metadata: { memberId, userId: member.userId },
    });

    return Response.json({ member: updated });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_member_patch");
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, memberId } = await ctx.params;
    const access = await requireCanonicalProjectOwner(projectId, userId);
    if (access.error || !access.project) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId, status: ProjectMemberStatus.active },
    });
    if (!member) {
      return apiError(ErrorCodes.NOT_FOUND, "Member not found", 404);
    }

    await prisma.projectMember.update({
      where: { id: memberId },
      data: { status: ProjectMemberStatus.removed },
    });

    await appendProjectTimelineEvent(prisma, {
      projectId,
      actorUserId: userId,
      kind: "member_removed",
      label: "Collaborator removed from project",
      metadata: { memberId, removedUserId: member.userId },
    });

    return Response.json({ ok: true });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_member_delete");
  }
}
