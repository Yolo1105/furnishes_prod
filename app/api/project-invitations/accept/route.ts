import { z } from "zod";
import {
  ProjectInviteStatus,
  ProjectMemberStatus,
  MemberRole,
} from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { hashInviteToken } from "@/lib/eva/projects/invite-token";
import { appendProjectTimelineEvent } from "@/lib/eva/projects/timeline";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  token: z.string().min(10).max(500),
});

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(
        ErrorCodes.UNAUTHORIZED,
        "Sign in to accept an invitation",
        401,
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Your account needs a verified email to accept invitations",
        400,
      );
    }

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }

    const tokenHash = hashInviteToken(parsed.data.token);
    const inv = await prisma.projectInvitation.findUnique({
      where: { tokenHash },
    });

    if (!inv || inv.status !== ProjectInviteStatus.pending) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        "Invitation not found or already used",
        404,
      );
    }

    if (inv.expiresAt < new Date()) {
      await prisma.projectInvitation.update({
        where: { id: inv.id },
        data: { status: ProjectInviteStatus.expired },
      });
      return apiError(ErrorCodes.VALIDATION_ERROR, "Invitation expired", 400);
    }

    if (normalizeEmail(user.email) !== normalizeEmail(inv.email)) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        "Signed-in account email must match the invitation",
        403,
      );
    }

    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: inv.projectId, userId },
      },
    });
    if (existing?.status === ProjectMemberStatus.active) {
      await prisma.projectInvitation.update({
        where: { id: inv.id },
        data: {
          status: ProjectInviteStatus.accepted,
          acceptedAt: new Date(),
          acceptedUserId: userId,
        },
      });
      return Response.json({
        ok: true,
        projectId: inv.projectId,
        alreadyMember: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectInvitation.update({
        where: { id: inv.id },
        data: {
          status: ProjectInviteStatus.accepted,
          acceptedAt: new Date(),
          acceptedUserId: userId,
        },
      });

      if (existing) {
        await tx.projectMember.update({
          where: { id: existing.id },
          data: {
            status: ProjectMemberStatus.active,
            role: inv.role,
            invitedByUserId: inv.invitedByUserId,
          },
        });
      } else {
        await tx.projectMember.create({
          data: {
            projectId: inv.projectId,
            userId,
            role: inv.role === MemberRole.owner ? MemberRole.editor : inv.role,
            status: ProjectMemberStatus.active,
            invitedByUserId: inv.invitedByUserId,
          },
        });
      }

      await appendProjectTimelineEvent(tx, {
        projectId: inv.projectId,
        actorUserId: userId,
        kind: "member_joined",
        label: "Collaborator joined the project",
        metadata: { invitationId: inv.id },
      });
    });

    return Response.json({
      ok: true,
      projectId: inv.projectId,
      alreadyMember: false,
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_invitations_accept");
  }
}
