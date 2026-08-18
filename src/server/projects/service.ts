import { cache } from "react";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { assertRowQuota, maxProjectsPerUser } from "@/server/quota";

type ProjectRole = "owner" | "editor" | "viewer";

export async function listProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: true,
    },
    orderBy: { project: { updatedAt: "desc" } },
  });

  const owned = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  });

  const byId = new Map<
    string,
    {
      id: string;
      name: string;
      summary: string | null;
      status: string;
      role: ProjectRole;
      updatedAt: string;
    }
  >();

  for (const project of owned) {
    byId.set(project.id, {
      id: project.id,
      name: project.name,
      summary: project.summary,
      status: project.status,
      role: "owner",
      updatedAt: project.updatedAt.toISOString(),
    });
  }

  for (const membership of memberships) {
    if (byId.has(membership.projectId)) continue;
    byId.set(membership.projectId, {
      id: membership.project.id,
      name: membership.project.name,
      summary: membership.project.summary,
      status: membership.project.status,
      role: membership.role as ProjectRole,
      updatedAt: membership.project.updatedAt.toISOString(),
    });
  }

  return [...byId.values()].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1,
  );
}

export async function createProject(
  userId: string,
  input: { name: string; summary?: string },
): Promise<ServiceResult<{ id: string }, "validation" | "rate_limited">> {
  const name = input.name.trim();
  if (!name) {
    return err("validation", "Project name is required.", {
      name: "Project name is required.",
    });
  }
  if (name.length > 120) {
    return err("validation", "Name is too long.", {
      name: "Name must be 120 characters or fewer.",
    });
  }

  const quota = await assertRowQuota(
    () => prisma.project.count({ where: { ownerId: userId } }),
    maxProjectsPerUser(),
    "projects",
  );
  if (!quota.ok) return quota;

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
      summary: input.summary?.trim() || null,
      status: "planning",
      members: {
        create: { userId, role: "owner" },
      },
      timeline: {
        create: {
          kind: "created",
          summary: "Project created",
        },
      },
    },
  });

  return ok({ id: project.id });
}

async function getAuthorizedProject(
  userId: string,
  projectId: string,
): Promise<{
  project: NonNullable<Awaited<ReturnType<typeof loadProject>>>;
  role: ProjectRole;
} | null> {
  const project = await loadProject(projectId);
  if (!project) return null;

  if (project.ownerId === userId) {
    return { project, role: "owner" };
  }

  const membership = project.members.find((m) => m.userId === userId);
  if (!membership) return null;

  return { project, role: membership.role as ProjectRole };
}

async function loadProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, displayName: true, email: true } },
        },
      },
      approvals: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, displayName: true, email: true } },
        },
      },
      timeline: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });
}

export const getProject = cache(async function getProject(
  userId: string,
  projectId: string,
): Promise<
  ServiceResult<
    {
      id: string;
      name: string;
      summary: string | null;
      brief: string | null;
      status: string;
      role: ProjectRole;
      updatedAt: string;
      members: Array<{
        userId: string;
        role: string;
        displayName: string | null;
        email: string;
      }>;
      comments: Array<{
        id: string;
        body: string;
        createdAt: string;
        displayName: string | null;
        email: string;
      }>;
      approvals: Array<{
        id: string;
        status: string;
        note: string | null;
        createdAt: string;
        displayName: string | null;
        email: string;
      }>;
      timeline: Array<{
        id: string;
        kind: string;
        summary: string;
        createdAt: string;
      }>;
      files: Array<{
        id: string;
        filename: string;
        status: string;
        createdAt: string;
      }>;
    },
    "not_found"
  >
> {
  const auth = await getAuthorizedProject(userId, projectId);
  if (!auth) return err("not_found", "Project not found.");

  const { project, role } = auth;
  return ok({
    id: project.id,
    name: project.name,
    summary: project.summary,
    brief: project.brief,
    status: project.status,
    role,
    updatedAt: project.updatedAt.toISOString(),
    members: project.members.map((member) => ({
      userId: member.userId,
      role: member.role,
      displayName: member.user.displayName,
      email: member.user.email,
    })),
    comments: project.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      displayName: comment.user.displayName,
      email: comment.user.email,
    })),
    approvals: project.approvals.map((approval) => ({
      id: approval.id,
      status: approval.status,
      note: approval.note,
      createdAt: approval.createdAt.toISOString(),
      displayName: approval.user.displayName,
      email: approval.user.email,
    })),
    timeline: project.timeline.map((event) => ({
      id: event.id,
      kind: event.kind,
      summary: event.summary,
      createdAt: event.createdAt.toISOString(),
    })),
    files: project.files.map((file) => ({
      id: file.id,
      filename: file.filename,
      status: file.status,
      createdAt: file.createdAt.toISOString(),
    })),
  });
});

export type ProjectDetail = Extract<
  Awaited<ReturnType<typeof getProject>>,
  { ok: true }
>["value"];

export async function updateProject(
  userId: string,
  projectId: string,
  input: { name?: string; summary?: string; brief?: string; status?: string },
): Promise<
  ServiceResult<{ id: string }, "not_found" | "forbidden" | "validation">
> {
  const auth = await getAuthorizedProject(userId, projectId);
  if (!auth) return err("not_found", "Project not found.");
  if (auth.role === "viewer") {
    return err("forbidden", "You do not have permission to edit this project.");
  }

  const name = input.name?.trim();
  if (name !== undefined && !name) {
    return err("validation", "Project name is required.", {
      name: "Project name is required.",
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(input.summary !== undefined
        ? { summary: input.summary.trim() || null }
        : {}),
      ...(input.brief !== undefined
        ? { brief: input.brief.trim() || null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      timeline: {
        create: {
          kind: "updated",
          summary: "Project details updated",
        },
      },
    },
  });

  return ok({ id: projectId });
}

export async function addProjectComment(
  userId: string,
  projectId: string,
  body: string,
): Promise<ServiceResult<{ id: string }, "not_found" | "validation">> {
  const auth = await getAuthorizedProject(userId, projectId);
  if (!auth) return err("not_found", "Project not found.");
  const trimmed = body.trim();
  if (!trimmed) {
    return err("validation", "Comment cannot be empty.", {
      body: "Comment cannot be empty.",
    });
  }

  const comment = await prisma.projectComment.create({
    data: { projectId, userId, body: trimmed },
  });
  await prisma.projectTimelineEvent.create({
    data: {
      projectId,
      kind: "comment",
      summary: "Comment added",
    },
  });
  return ok({ id: comment.id });
}

export async function setProjectApproval(
  userId: string,
  projectId: string,
  status: "approved" | "rejected" | "pending",
  note?: string,
): Promise<ServiceResult<{ id: string }, "not_found">> {
  const auth = await getAuthorizedProject(userId, projectId);
  if (!auth) return err("not_found", "Project not found.");

  const existing = await prisma.projectApproval.findFirst({
    where: { projectId, userId },
  });

  const approval = existing
    ? await prisma.projectApproval.update({
        where: { id: existing.id },
        data: { status, note: note?.trim() || null },
      })
    : await prisma.projectApproval.create({
        data: {
          projectId,
          userId,
          status,
          note: note?.trim() || null,
        },
      });

  await prisma.projectTimelineEvent.create({
    data: {
      projectId,
      kind: "approval",
      summary: `Approval marked ${status}`,
    },
  });

  return ok({ id: approval.id });
}

export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<ServiceResult<{ deleted: true }, "not_found" | "forbidden">> {
  const auth = await getAuthorizedProject(userId, projectId);
  if (!auth) return err("not_found", "Project not found.");
  if (auth.role !== "owner") {
    return err("forbidden", "Only the owner can delete this project.");
  }
  await prisma.project.delete({ where: { id: projectId } });
  return ok({ deleted: true });
}
