import type { Project, ProjectMember } from "@prisma/client";
import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/eva/db";

export type ProjectAccessRole = "owner" | "editor" | "viewer";

export type ProjectAccessResult = {
  project: Project & { members: ProjectMember[] };
  /** Canonical project owner (`Project.userId`). */
  isCanonicalOwner: boolean;
  /** Effective role for permissions: canonical owner is always `owner`. */
  role: ProjectAccessRole;
  /** Set when access is via a membership row. */
  memberId: string | null;
};

const ROLE_RANK: Record<ProjectAccessRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function memberRoleToAccess(role: MemberRole): ProjectAccessRole {
  if (role === MemberRole.owner) return "owner";
  if (role === MemberRole.editor) return "editor";
  return "viewer";
}

/**
 * Resolve project access: canonical owner, or active ProjectMember row.
 */
export async function getProjectAccess(
  projectId: string,
  userId: string | null,
): Promise<ProjectAccessResult | null> {
  if (!userId) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { where: { status: "active" } },
    },
  });
  if (!project) return null;
  if (project.userId === userId) {
    return {
      project,
      isCanonicalOwner: true,
      role: "owner",
      memberId: null,
    };
  }
  const m = project.members.find((x) => x.userId === userId);
  if (!m) return null;
  return {
    project,
    isCanonicalOwner: false,
    role: memberRoleToAccess(m.role),
    memberId: m.id,
  };
}

function meetsMinRole(
  role: ProjectAccessRole,
  min: ProjectAccessRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Read-only project data (GET list, summary, export, comments, timeline). */
export async function requireProjectViewer(
  projectId: string,
  userId: string | null,
) {
  if (!userId) {
    return {
      error: "Unauthorized" as const,
      status: 401 as const,
      access: null as ProjectAccessResult | null,
    };
  }
  const access = await getProjectAccess(projectId, userId);
  if (!access) {
    return {
      error: "Not found" as const,
      status: 404 as const,
      access: null as ProjectAccessResult | null,
    };
  }
  return { error: null, status: 200, access };
}

/** Edit project content, shortlist, execution, decisions (not membership). */
export async function requireProjectEditor(
  projectId: string,
  userId: string | null,
) {
  if (!userId) {
    return {
      error: "Unauthorized" as const,
      status: 401 as const,
      access: null as ProjectAccessResult | null,
    };
  }
  const access = await getProjectAccess(projectId, userId);
  if (!access) {
    return {
      error: "Not found" as const,
      status: 404 as const,
      access: null as ProjectAccessResult | null,
    };
  }
  if (!meetsMinRole(access.role, "editor")) {
    return {
      error: "Forbidden" as const,
      status: 403 as const,
      access: null as ProjectAccessResult | null,
    };
  }
  return { error: null, status: 200, access };
}

/** Only the user who created the project (invite/remove collaborators). */
export async function requireCanonicalProjectOwner(
  projectId: string,
  userId: string | null,
) {
  if (!userId) {
    return {
      error: "Unauthorized" as const,
      status: 401 as const,
      project: null as Project | null,
    };
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    return {
      error: "Not found" as const,
      status: 404 as const,
      project: null as Project | null,
    };
  }
  return { error: null, status: 200, project };
}

/**
 * @deprecated Use `requireCanonicalProjectOwner` for membership APIs or
 * `requireProjectEditor` / `requireProjectViewer` for shared projects.
 */
export async function requireProjectOwner(
  projectId: string,
  userId: string | null,
) {
  const r = await requireCanonicalProjectOwner(projectId, userId);
  if (r.error || !r.project) {
    return { error: r.error, status: r.status, project: null };
  }
  return { error: null, status: 200 as const, project: r.project };
}
