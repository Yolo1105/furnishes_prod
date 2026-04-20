import { z } from "zod";
import { MemberRole, ProjectInviteStatus } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireCanonicalProjectOwner } from "@/lib/eva/projects/access";
import { newInviteToken } from "@/lib/eva/projects/invite-token";
import { appendProjectTimelineEvent } from "@/lib/eva/projects/timeline";

export const dynamic = "force-dynamic";

const InviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["editor", "viewer"]),
});

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

/** List pending invitations — canonical owner only. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, "Sign in required", 401);
    }
    const { id: projectId } = await ctx.params;
    const access = await requireCanonicalProjectOwner(projectId, userId);
    if (access.error || !access.project) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const rows = await prisma.projectInvitation.findMany({
      where: { projectId, status: ProjectInviteStatus.pending },
      orderBy: { invitedAt: "desc" },
      take: 48,
      select: {
        id: true,
        email: true,
        role: true,
        invitedAt: true,
        expiresAt: true,
      },
    });
    return Response.json({ invitations: rows });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_invitations_get");
  }
}

/** Create invitation — canonical owner only. Returns one-time token for sharing. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, "Sign in required", 401);
    }
    const { id: projectId } = await ctx.params;
    const access = await requireCanonicalProjectOwner(projectId, userId);
    if (access.error || !access.project) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }
    const email = normalizeEmail(parsed.data.email);
    const role =
      parsed.data.role === "editor" ? MemberRole.editor : MemberRole.viewer;

    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (owner?.email && normalizeEmail(owner.email) === email) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "You cannot invite your own account email",
        400,
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUser) {
      const already = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: existingUser.id,
          status: "active",
        },
      });
      if (already) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          "That user is already a collaborator",
          400,
        );
      }
    }

    const pendingSame = await prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email,
        status: ProjectInviteStatus.pending,
      },
    });
    if (pendingSame) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "An invitation is already pending for that email",
        400,
      );
    }

    const { raw, hash } = newInviteToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const inv = await prisma.projectInvitation.create({
      data: {
        projectId,
        email,
        role,
        tokenHash: hash,
        invitedByUserId: userId,
        expiresAt,
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    });

    await appendProjectTimelineEvent(prisma, {
      projectId,
      actorUserId: userId,
      kind: "invitation_sent",
      label: `Invitation sent to ${email} (${role})`,
      metadata: { invitationId: inv.id, email: inv.email },
    });

    return Response.json({
      invitation: inv,
      /** One-time secret — share the accept link with the invitee only. */
      token: raw,
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_invitations_post");
  }
}
